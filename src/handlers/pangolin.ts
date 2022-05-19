import {Result} from '@ethersproject/abi';
import {BigNumber} from '@ethersproject/bignumber';
import type {Handler} from 'worktop';
import {send} from 'worktop/response';
import {ZERO_ADDRESS, ZERO, ONE_TOKEN} from '../constants';
import {
  getBalance,
  getDecimals,
  getTotalSupply,
  getPoolTokens,
  getStakingTokenAddressFromMiniChefV2,
  getRewardPerSecondFromMiniChefV2,
  getTotalAllocationPointsFromMiniChefV2,
  getPoolInfoFromMiniChefV2,
  getStakingTokenAddressesFromMiniChefV2,
  getRewarder,
  getRewarderViaMultiplierGetRewardTokens,
  getRewarderViaMultiplierPendingTokens,
} from '../utils/calls';
import {getChainInfo} from '../utils/chain';
import {expandTo18Decimals, convertStringToBigNumber} from '../utils/conversion';
import * as gql from '../utils/gql';
import {getETHPrice, getPairPriceUSD, getTokenPriceETH} from '../utils/gql';
import * as QUERIES from '../utils/queries';

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

  const aprs = {
    swapFeeApr: 0,
    stakingApr: 0,
    combinedApr: 0,
  };

  const poolId = context.params.pid;

  try {
    const stakingTokenAddress = await getStakingTokenAddressFromMiniChefV2(
      chainInfo.rpc,
      chainInfo.mini_chef,
      poolId,
    );

    // Number of days to average swap volume from
    const days = 7;

    const [
      {pairDayDatas},
      avaxPriceString,
      derivedPngString,
      pairValueUSD,
      [token0, token1],
      rewardPerSecond,
      poolInfo,
      totalAllocPoints,
      rewarderAddress,
    ] = await Promise.all([
      // Swap volume over 7 days
      gql.request(QUERIES.DAILY_VOLUME, chainInfo.subgraph_exchange, {
        days,
        pairAddress: stakingTokenAddress,
      }),

      // AVAX price in terms of USD
      getETHPrice(chainInfo.subgraph_exchange),

      // PNG price in terms of AVAX
      getTokenPriceETH(chainInfo.subgraph_exchange, chainInfo.png),

      // Get pool USD reserve value
      getPairPriceUSD(chainInfo.subgraph_exchange, stakingTokenAddress),

      // Get the two token addresses in the pool
      getPoolTokens(chainInfo.rpc, stakingTokenAddress),

      // Current staking reward rate
      getRewardPerSecondFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

      // Pool information especially allocation points
      getPoolInfoFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef, poolId),

      // Total allocation points
      getTotalAllocationPointsFromMiniChefV2(chainInfo.rpc, chainInfo.mini_chef),

      // Rewarder address
      getRewarder(chainInfo.rpc, chainInfo.mini_chef, poolId),
    ]);

    const [pglTotalSupply, pglStaked] = await Promise.all<BigNumber>([
      getTotalSupply(chainInfo.rpc, stakingTokenAddress),
      getBalance(chainInfo.rpc, stakingTokenAddress, chainInfo.mini_chef),
    ]);

    const avaxPrice = convertStringToBigNumber(avaxPriceString, 0, 18);
    const pngPrice = convertStringToBigNumber(derivedPngString, 0, 18)
      .mul(avaxPrice)
      .div(ONE_TOKEN);

    // Process additional SuperFarm rewards
    let extraRewardTokensPerSecondInPNG = ZERO;
    if (rewarderAddress !== ZERO_ADDRESS) {
      const [superFarmRewardTokens, [, superFarmMultipliers]] = await Promise.all<string[], Result>(
        [
          getRewarderViaMultiplierGetRewardTokens(chainInfo.rpc, rewarderAddress),
          getRewarderViaMultiplierPendingTokens(
            chainInfo.rpc,
            rewarderAddress,
            ZERO_ADDRESS,
            ONE_TOKEN.toString(),
          ),
        ],
      );

      const [rewardDecimals, rewardTokenPricesInPNG] = await Promise.all<BigNumber[], BigNumber[]>([
        Promise.all<BigNumber>(
          superFarmRewardTokens.map(async (address: string) => getDecimals(chainInfo.rpc, address)),
        ),
        Promise.all<BigNumber>(
          superFarmRewardTokens.map(async (address: string) => { // eslint-disable-line
            return getTokenPriceETH(chainInfo.subgraph_exchange, address).then(
              (derivedAVAX: string) =>
                convertStringToBigNumber(derivedAVAX, 0, 18).mul(avaxPrice).div(pngPrice),
            );
          }),
        ),
      ]);

      for (let i = 0; i < superFarmRewardTokens.length; i++) {
        const rewardPerSecInReward = rewardPerSecond
          .mul(poolInfo.allocPoint)
          .div(totalAllocPoints)
          .mul(superFarmMultipliers[i])
          .div(ONE_TOKEN)
          .mul(rewardTokenPricesInPNG[i])
          .div(ONE_TOKEN);

        const rewardPerSecInPNG = expandTo18Decimals(rewardPerSecInReward, rewardDecimals[i]);
        extraRewardTokensPerSecondInPNG = extraRewardTokensPerSecondInPNG.add(rewardPerSecInPNG);
      }
    }

    let stakedPNG;
    if ([token0, token1].includes(chainInfo.png.toLowerCase())) {
      const halfPairValueInPNG = await getBalance(
        chainInfo.rpc,
        chainInfo.png,
        stakingTokenAddress,
      );
      stakedPNG = halfPairValueInPNG.mul(2).mul(pglStaked).div(pglTotalSupply);
    } else {
      const pairValueInPNG = convertStringToBigNumber(pairValueUSD, 0, 18)
        .mul(ONE_TOKEN)
        .div(pngPrice);
      stakedPNG = pairValueInPNG.mul(pglStaked).div(pglTotalSupply);
    }

    const poolRewardPerSecInPNG = rewardPerSecond.mul(poolInfo.allocPoint).div(totalAllocPoints);
    const stakingAPR = stakedPNG.isZero()
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
    const combinedAPR = stakingAPR.add(swapFeeAPR);

    aprs.swapFeeApr = swapFeeAPR.toNumber();
    aprs.stakingApr = stakingAPR.toNumber();
    aprs.combinedApr = combinedAPR.toNumber();
  } catch {}

  return send(200, aprs, {
    'Cache-Control': 'public,s-maxage=60',
  });
};

export const stakingTokenAddresses: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const stakingTokenAddresses = await getStakingTokenAddressesFromMiniChefV2(
    chainInfo.rpc,
    chainInfo.mini_chef,
  );
  return send(200, stakingTokenAddresses?.[0], {
    'Cache-Control': 'public,s-maxage=216000',
  });
};
