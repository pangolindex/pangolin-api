import {BigNumber} from '@ethersproject/bignumber';
import type {Handler} from 'worktop';
import {send} from 'worktop/response';
import {EIGHTEEN, ZERO, ZERO_ADDRESS} from '../constants';
import {
  getBalance,
  getPoolInfoFromMiniChefV2,
  getPoolInfosFromMiniChefV2,
  getRewarder,
  getRewarderViaMultiplierRewardTokens,
  getRewardPerSecondFromMiniChefV2,
  getStakingTokenAddressesFromMiniChefV2,
  getStakingTokenAddressFromMiniChefV2,
  getTotalAllocationPointsFromMiniChefV2,
  getTotalSupply,
  getRewarderViaMultiplierRewardMultipliers,
} from '../utils/calls';
import {ChainInfo, getChainInfo} from '../utils/chain';
import {convertStringToBigNumber, adjustValueDecimals, scalar} from '../utils/conversion';
import * as gql from '../utils/gql';
import * as QUERIES from '../utils/queries';
import {AprResponse, PoolInfo} from '../utils/interfaces';

export const addresses: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let number_addresses = 0;
  let new_addrs = 0;
  let firstUser = ZERO_ADDRESS;

  do {
    const {users} = await gql.request(QUERIES.USER, chainInfo.subgraph_exchange, {
      first: 1000,
      firstUser,
      orderBy: 'id',
    });
    firstUser = users[users.length - 1].id;
    new_addrs = users.length;
    number_addresses += new_addrs;
  } while (new_addrs === 1000);

  return send(200, number_addresses, {
    'Cache-Control': 'public,s-maxage=86400',
  });
};

export const average: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const result = await gql.request(
    QUERIES._FACTORY(chainInfo.factory),
    chainInfo.subgraph_exchange,
  );
  const {totalVolumeUSD, txCount} = result.pangolinFactories[0];

  const text = (Number.parseFloat(totalVolumeUSD) / Number.parseInt(txCount, 10)).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=86400',
  });
};

export const aprLegacy: Handler = async () => {
  const aprs = {
    swapFeeApr: 0,
    stakingApr: 0,
    combinedApr: 0,
  };

  return send(200, aprs, {
    'Cache-Control': 'public,s-maxage=86400',
  });
};

export const aprChef: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const poolId = context.params.pid;

  const stakingTokenAddress = await getStakingTokenAddressFromMiniChefV2(
    chainInfo.rpc,
    chainInfo.mini_chef,
    poolId,
  );

  // Number of days to average swap volume from
  const days = 7;

  // TODO: Don't assume the network PNG has 18 decimals
  const pngDecimals = 18;

  const [{pairDayDatas}, poolInfo, totalAllocPoints, rewardPerSecond] = await Promise.all<
    any,
    PoolInfo,
    BigNumber,
    BigNumber
  >([
    // Variable: {pairDayDatas}
    gql.request(QUERIES.DAILY_VOLUME, chainInfo.subgraph_exchange, {
      days,
      pairAddress: stakingTokenAddress,
    }),

    // Variable: poolInfo
    getPoolInfoFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef, poolId),

    // Variable: totalAllocPoints
    getTotalAllocationPointsFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

    // Variable: rewardPerSecond
    getRewardPerSecondFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),
  ]);

  const farmAllocPoints: BigNumber = poolInfo.allocPoint;
  const isActiveChef: boolean = totalAllocPoints.gt(ZERO) && rewardPerSecond.gt(ZERO);
  const isActiveFarm: boolean = isActiveChef && farmAllocPoints.gt(ZERO);

  const [_avaxPrice, _derivedPng, pairValueUSD, rewarderAddress, pglTotalSupply, pglStaked] =
    await Promise.all<string, string, string, string, BigNumber, BigNumber>([
      // Variable: _avaxPrice
      isActiveFarm ? gql.getETHPrice(chainInfo.subgraph_exchange) : '0',

      // Variable: _derivedPng
      isActiveFarm ? gql.getTokenPriceETH(chainInfo.subgraph_exchange, chainInfo.png) : '0',

      // Variable: pairValueUSD
      isActiveFarm ? gql.getPairPriceUSD(chainInfo.subgraph_exchange, stakingTokenAddress) : '0',

      // Variable: rewarderAddress
      isActiveFarm ? getRewarder(chainInfo.rpc, chainInfo.mini_chef, poolId) : ZERO_ADDRESS,

      // Variable: pglTotalSupply
      isActiveFarm ? getTotalSupply(chainInfo.rpc, stakingTokenAddress) : ZERO,

      // Variable: pglStaked
      isActiveFarm ? getBalance(chainInfo.rpc, stakingTokenAddress, chainInfo.mini_chef) : ZERO,
    ]);

  const avaxPrice = convertStringToBigNumber(_avaxPrice, 0, chainInfo.native_currency_decimals);
  const pngPrice = convertStringToBigNumber(_derivedPng, 0, pngDecimals)
    .mul(avaxPrice)
    .div(scalar(chainInfo.native_currency_decimals));

  // Process additional SuperFarm rewards (if any)
  const extraRewardTokensPerSecondInPNG = await getRewarderTokensPerSecondInPNG(
    chainInfo,
    rewarderAddress,
    rewardPerSecond,
    totalAllocPoints,
    farmAllocPoints,
    avaxPrice,
    pngPrice,
  );

  let stakedPNG = ZERO;

  if (isActiveFarm && pglTotalSupply.gt(ZERO) && pngPrice.gt(ZERO)) {
    const pairValueInPNG: BigNumber = convertStringToBigNumber(pairValueUSD, 0, pngDecimals)
      .mul(scalar(pngDecimals))
      .div(pngPrice);
    stakedPNG = pairValueInPNG.mul(pglStaked).div(pglTotalSupply);
  }

  const poolRewardPerSecInPNG: BigNumber = rewardPerSecond
    .mul(farmAllocPoints)
    .div(totalAllocPoints);
  const stakingAPR: BigNumber = stakedPNG.isZero()
    ? ZERO
    : poolRewardPerSecInPNG
        .add(extraRewardTokensPerSecondInPNG)
        // Percentage
        .mul(100)
        // Calculate reward rate per year
        .mul(60 * 60 * 24 * 365)
        // Divide by amount staked to get APR
        .div(stakedPNG);

  let swapVolumeUSD = ZERO;
  let liquidityUSD = ZERO;

  for (const {dailyVolumeUSD, reserveUSD} of pairDayDatas) {
    swapVolumeUSD = swapVolumeUSD.add(Math.floor(dailyVolumeUSD));
    liquidityUSD = liquidityUSD.add(Math.floor(reserveUSD));
  }

  const fees = swapVolumeUSD.mul(365).div(pairDayDatas.length).mul(3).div(1000);
  const averageLiquidityUSD = liquidityUSD.div(pairDayDatas.length);
  const swapFeeAPR = averageLiquidityUSD.isZero() ? ZERO : fees.mul(100).div(averageLiquidityUSD);

  const apr: AprResponse = {
    swapFeeApr: swapFeeAPR.toNumber(),
    stakingApr: stakingAPR.toNumber(),
    combinedApr: stakingAPR.add(swapFeeAPR).toNumber(),
  };

  return send(200, apr, {
    'Cache-Control': 'public,s-maxage=900',
  });
};

export const aprChefMultiple: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const poolIds: string[] = context.params.pids.split(',');

  if (poolIds.length > 4) {
    throw new Error('Too many pids');
  }

  // Number of days to average swap volume from
  const days = 7;

  // TODO: Don't assume the network PNG has 18 decimals
  const pngDecimals = 18;

  // Singular data
  const [_avaxPrice, _derivedPng, lpTokens, poolInfos, rewardPerSecond, totalAllocPoints] =
    await Promise.all<string, string, string[], PoolInfo[], BigNumber, BigNumber>([
      // Variable: _avaxPrice
      gql.getETHPrice(chainInfo.subgraph_exchange),

      // Variable: _derivedPng
      gql.getTokenPriceETH(chainInfo.subgraph_exchange, chainInfo.png),

      // Variable: _lpTokens
      getStakingTokenAddressesFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

      // Variable: poolInfos
      getPoolInfosFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

      // Variable: rewardPerSecond
      getRewardPerSecondFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

      // Variable: totalAllocPoints
      getTotalAllocationPointsFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),
    ]);

  // Format singular data
  const avaxPrice: BigNumber = convertStringToBigNumber(
    _avaxPrice,
    0,
    chainInfo.native_currency_decimals,
  );
  const pngPrice: BigNumber = convertStringToBigNumber(_derivedPng, 0, pngDecimals)
    .mul(avaxPrice)
    .div(scalar(chainInfo.native_currency_decimals));
  const isActiveChef: boolean = totalAllocPoints.gt(ZERO) && rewardPerSecond.gt(ZERO);

  const aprs: AprResponse[] = [];

  // Iterated data
  for (const poolId of poolIds) {
    const pid: number = Number.parseInt(poolId, 10);
    if (pid < 0 || pid >= lpTokens.length) {
      throw new Error(`Invalid pid ${pid}`);
    }

    const stakingTokenAddress: string = lpTokens[pid];
    const farmAllocPoints: BigNumber = poolInfos[pid].allocPoint;
    const isActiveFarm: boolean = isActiveChef && farmAllocPoints.gt(ZERO);
    const [{pairDayDatas}, pairValueUSD, rewarderAddress, pglTotalSupply, pglStaked] =
      await Promise.all([
        // Variable: {pairDayDatas}
        gql.request(QUERIES.DAILY_VOLUME, chainInfo.subgraph_exchange, {
          days,
          pairAddress: stakingTokenAddress,
        }),

        // Variable: pairValueUSD,
        isActiveFarm ? gql.getPairPriceUSD(chainInfo.subgraph_exchange, stakingTokenAddress) : '0',

        // Variable: rewarderAddress
        isActiveFarm
          ? getRewarder(chainInfo.rpc, chainInfo.mini_chef, pid.toString())
          : ZERO_ADDRESS,

        // Variable: pglTotalSupply
        isActiveFarm ? getTotalSupply(chainInfo.rpc, stakingTokenAddress) : ZERO,

        // Variable: pglStaked
        isActiveFarm ? getBalance(chainInfo.rpc, stakingTokenAddress, chainInfo.mini_chef) : ZERO,
      ]);

    // Process additional SuperFarm rewards (if any)
    const extraRewardTokensPerSecondInPNG = await getRewarderTokensPerSecondInPNG(
      chainInfo,
      rewarderAddress,
      rewardPerSecond,
      totalAllocPoints,
      farmAllocPoints,
      avaxPrice,
      pngPrice,
    );

    let stakedPNG = ZERO;

    if (isActiveFarm && pglTotalSupply.gt(ZERO) && pngPrice.gt(ZERO)) {
      const pairValueInPNG: BigNumber = convertStringToBigNumber(pairValueUSD, 0, pngDecimals)
        .mul(scalar(pngDecimals))
        .div(pngPrice);
      stakedPNG = pairValueInPNG.mul(pglStaked).div(pglTotalSupply);
    }

    const poolRewardPerSecInPNG: BigNumber = rewardPerSecond
      .mul(farmAllocPoints)
      .div(totalAllocPoints);
    const stakingAPR: BigNumber = stakedPNG.isZero()
      ? ZERO
      : poolRewardPerSecInPNG
          .add(extraRewardTokensPerSecondInPNG)
          // Percentage
          .mul(100)
          // Calculate reward rate per year
          .mul(60 * 60 * 24 * 365)
          // Divide by amount staked to get APR
          .div(stakedPNG);

    let swapVolumeUSD = ZERO;
    let liquidityUSD = ZERO;

    for (const {dailyVolumeUSD, reserveUSD} of pairDayDatas) {
      swapVolumeUSD = swapVolumeUSD.add(Math.floor(dailyVolumeUSD));
      liquidityUSD = liquidityUSD.add(Math.floor(reserveUSD));
    }

    const fees = swapVolumeUSD.mul(365).div(pairDayDatas.length).mul(3).div(1000);
    const averageLiquidityUSD = liquidityUSD.div(pairDayDatas.length);
    const swapFeeAPR = averageLiquidityUSD.isZero() ? ZERO : fees.mul(100).div(averageLiquidityUSD);

    aprs.push({
      swapFeeApr: swapFeeAPR.toNumber(),
      stakingApr: stakingAPR.toNumber(),
      combinedApr: stakingAPR.add(swapFeeAPR).toNumber(),
    });
  }

  return send(200, aprs, {
    'Cache-Control': 'public,s-maxage=900',
  });
};

export const stakingTokenAddresses: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const stakingTokenAddresses = await getStakingTokenAddressesFromMiniChefV2(
    chainInfo.rpc,
    chainInfo.mini_chef,
  );
  return send(200, stakingTokenAddresses, {
    'Cache-Control': 'public,s-maxage=216000',
  });
};

async function getRewarderTokensPerSecondInPNG(
  chainInfo: ChainInfo,
  rewarderAddress: string,
  rewardPerSecond: BigNumber,
  totalAllocPoints: BigNumber,
  farmAllocPoints: BigNumber,
  avaxPrice: BigNumber,
  pngPrice: BigNumber,
): Promise<BigNumber> {
  // No rewarder means no extra rewards
  if (rewarderAddress === ZERO_ADDRESS) return ZERO;

  const [rewardAddresses, rewardMultipliers] = await Promise.all<string[], BigNumber[]>([
    getRewarderViaMultiplierRewardTokens(chainInfo.rpc, rewarderAddress),
    getRewarderViaMultiplierRewardMultipliers(chainInfo.rpc, rewarderAddress),
  ]);

  const rewardInfos = await Promise.all<{decimals: BigNumber; price: BigNumber}>(
    rewardAddresses.map(async (address: string) => {
      try {
        const {decimals, derivedETH} = await gql.getTokenInfo(chainInfo.subgraph_exchange, address);
        return {
          price: convertStringToBigNumber(derivedETH, 0, 18).mul(avaxPrice).div(pngPrice),
          decimals: BigNumber.from(decimals),
        };
      } catch {
        // Failsafe for when a reward token does not exist in the subgraph
        return {price: ZERO, decimals: EIGHTEEN};
      }
    }),
  );

  const rewardDecimals = rewardInfos.map(({decimals}) => decimals);
  const rewardPricesInPNG = rewardInfos.map(({price}) => price);

  let extraRewardTokensPerSecondInPNG = ZERO;
  const baseRewardPerSecond = rewardPerSecond.mul(farmAllocPoints).div(totalAllocPoints);

  // TODO: Don't assume the network PNG has 18 decimals
  const pngDecimals = 18;

  for (let i = 0; i < rewardAddresses.length; i++) {
    const rewardPerSecInReward: BigNumber = baseRewardPerSecond
      .mul(rewardMultipliers[i])
      .div(scalar(pngDecimals))
      .mul(rewardPricesInPNG[i])
      .div(scalar(pngDecimals));

    const rewardPerSecInPNG = adjustValueDecimals(
      rewardPerSecInReward,
      rewardDecimals[i],
      pngDecimals,
    );
    extraRewardTokensPerSecondInPNG = extraRewardTokensPerSecondInPNG.add(rewardPerSecInPNG);
  }

  return extraRewardTokensPerSecondInPNG;
}
