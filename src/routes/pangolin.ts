import type {Handler} from 'worktop';
import {send} from 'worktop/response';
import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
import * as QUERIES from '../utils/queries';
import * as gql from '../utils/gql';
import {
  ZERO_ADDRESS,
  STAKING_ADDRESSES,
  WAVAX_ADDRESS,
  PNG_ADDRESS,
  WAVAX_PNG_ADDRESS,
  DAIe_ADDRESS,
  USDCe_ADDRESS,
  USDTe_ADDRESS,
  ZERO,
  TEN,
  EIGHTEEN,
  ONE_TOKEN,
  MINICHEFV2_ADDRESS,
} from '../constants';
import {
  getStakingTokenAddress,
  getBalance,
  getTotalSupply,
  getPoolTokens,
  getRewardRate,
  getStakingTokenAddressFromMiniChefV2,
  getRewardPerSecondFromMiniChefV2,
  getTotalAllocationPointsFromMiniChefV2,
  getPoolInfoFromMiniChefV2,
  getStakingTokenAddressesFromMiniChefV2,
  getRewarder,
  getRewarderViaMultiplierGetRewardTokens,
  getRewarderViaMultiplierPendingTokens,
} from '../utils/calls';

// GET /pangolin/addresses
export const addresses: Handler = async function () {
  let number_addresses = 0;
  let new_addrs = 0;
  let firstUser = '0x0000000000000000000000000000000000000000';

  do {
    const {users} = await gql.request(QUERIES.USER, {
      first: 1000,
      firstUser,
      orderBy: 'id',
    });
    firstUser = users[users.length - 1].id;
    new_addrs = users.length;
    number_addresses += new_addrs;
  } while (new_addrs === 1000);

  return send(200, number_addresses, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /pangolin/transaction-average
export const average: Handler = async function () {
  const result = await gql.request(QUERIES.FACTORY);
  const {totalVolumeUSD, txCount} = result.pangolinFactories[0];

  const text = (Number.parseFloat(totalVolumeUSD) / Number.parseInt(txCount, 10)).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /pangolin/transaction-median
// export const median: Handler = async function () {};

// GET /pangolin/apr/:address
export const apr: Handler = async function (_, context) {
  const aprs = {
    swapFeeApr: 0,
    stakingApr: 0,
    combinedApr: 0,
  };

  const stakingAddress = context.params.address;

  if (!STAKING_ADDRESSES.includes(stakingAddress)) {
    return send(200, aprs);
  }

  try {
    const stakingTokenAddress = await getStakingTokenAddress(stakingAddress);

    // Number of days to average swap volume from
    const days = 7;

    const [
      {pairDayDatas},
      poolTokenBalance,
      poolTokenSupply,
      [token0, token1],
      pooledAVAX,
      pooledPNG,
      stakingRewardRate,
    ] = await Promise.all([
      // Swap volume over 7 days
      gql.request(QUERIES.DAILY_VOLUME, {
        days,
        pairAddress: stakingTokenAddress,
      }),

      // How much PGL is staked
      getBalance(stakingTokenAddress, stakingAddress),

      // Total PGL supply
      getTotalSupply(stakingTokenAddress),

      // Get the two token addresses in the pool
      getPoolTokens(stakingTokenAddress),

      // How much AVAX is in the AVAX-PNG pool
      getBalance(WAVAX_ADDRESS, WAVAX_PNG_ADDRESS),

      // How much PNG is in the AVAX-PNG pool
      getBalance(PNG_ADDRESS, WAVAX_PNG_ADDRESS),

      // Current staking reward rate
      getRewardRate(stakingAddress),
    ]);

    if (poolTokenSupply.isZero()) {
      return send(200, aprs);
    }

    const stakedAVAX = [token0, token1].includes(WAVAX_ADDRESS)
      ? (await getBalance(WAVAX_ADDRESS, stakingTokenAddress))
          // Other side of pool has equal value
          .mul(2)
          // Not all PGL is staked
          .mul(poolTokenBalance)
          .div(poolTokenSupply)
      : (await getBalance(PNG_ADDRESS, stakingTokenAddress))
          // Other side of pool has equal value
          .mul(2)
          // Convert to AVAX
          .mul(pooledAVAX)
          .div(pooledPNG)
          // Not all PGL is staked
          .mul(poolTokenBalance)
          .div(poolTokenSupply);

    const stakingAPR = stakedAVAX.isZero()
      ? ZERO
      : stakingRewardRate
          // Reward rate is per second
          .mul(60 * 60 * 24 * 365)
          // Convert to AVAX
          .mul(pooledAVAX)
          .div(pooledPNG)
          // Percentage
          .mul(100)
          // Divide by amount staked to get APR
          .div(stakedAVAX);

    let swapVolumeUSD = ZERO;
    let liquidityUSD = ZERO;
    for (const {dailyVolumeUSD, reserveUSD} of pairDayDatas) {
      swapVolumeUSD = swapVolumeUSD.add(Math.floor(dailyVolumeUSD));
      liquidityUSD = liquidityUSD.add(Math.floor(reserveUSD));
    }

    const fees = swapVolumeUSD.mul(365).div(days).mul(3).div(1000);
    const averageLiquidityUSD = liquidityUSD.div(days);
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

// GET /pangolin/apr2/:pid
export const apr2: Handler = async function (_, context) {
  const aprs = {
    swapFeeApr: 0,
    stakingApr: 0,
    combinedApr: 0,
  };

  const poolId = context.params.pid;

  // Verify valid poolId

  try {
    const stakingTokenAddress = await getStakingTokenAddressFromMiniChefV2(poolId);

    // Number of days to average swap volume from
    const days = 7;

    const [
      {pairDayDatas},
      {
        bundle: {ethPrice: avaxPriceString},
      },
      {
        token: {derivedETH: derivedPngString},
      },
      [token0, token1],
      rewardPerSecond,
      poolInfo,
      totalAllocPoints,
      rewarderAddress,
    ] = await Promise.all([
      // Swap volume over 7 days
      gql.request(QUERIES.DAILY_VOLUME, {
        days,
        pairAddress: stakingTokenAddress,
      }),

      // AVAX price in terms of USD
      gql.request(QUERIES.AVAX_PRICE),

      // PNG price in terms of AVAX
      gql.request(QUERIES.TOKEN_PRICE, {
        address: PNG_ADDRESS.toLowerCase(),
      }),

      // Get the two token addresses in the pool
      getPoolTokens(stakingTokenAddress),

      // Current staking reward rate
      getRewardPerSecondFromMiniChefV2(),

      // Pool information especially allocation points
      getPoolInfoFromMiniChefV2(poolId),

      // Total allocation points
      getTotalAllocationPointsFromMiniChefV2(),

      // Rewarder address
      getRewarder(poolId),
    ]);

    const [pglTotalSupply, pglStaked] = await Promise.all([
      getTotalSupply(stakingTokenAddress),
      getBalance(stakingTokenAddress, MINICHEFV2_ADDRESS),
    ]);

    const avaxPrice = convertStringToBigNumber(avaxPriceString, 0, 18);
    const pngPrice = convertStringToBigNumber(derivedPngString, 0, 18)
      .mul(avaxPrice)
      .div(ONE_TOKEN);

    let extraRewardTokensPerSecondInPNG = ZERO;

    if (rewarderAddress !== ZERO_ADDRESS) {
      const [superFarmRewardTokens, [, superFarmMultipliers]] = await Promise.all([
        getRewarderViaMultiplierGetRewardTokens(rewarderAddress),
        getRewarderViaMultiplierPendingTokens(rewarderAddress, ZERO_ADDRESS, ONE_TOKEN.toString()),
      ]);

      const derivedAVAXResults = await Promise.all(
        superFarmRewardTokens.map(async (address: string) => getDerivedAVAXFromToken(address)), // eslint-disable-line
      );
      const rewardTokenPricesInAVAX = derivedAVAXResults.map((x: any) => {
        return convertStringToBigNumber(x.token.derivedETH, 0, 18);
      });
      const rewardTokenPricesInPNG = rewardTokenPricesInAVAX.map((x: BigNumber) => {
        return x.mul(avaxPrice).div(pngPrice);
      });

      for (let i = 0; i < superFarmRewardTokens.length; i++) {
        const rewardPerSec = rewardPerSecond
          .mul(poolInfo.allocPoint)
          .div(totalAllocPoints)
          .mul(superFarmMultipliers[i])
          .div(ONE_TOKEN);

        const rewardPerSecInPNG = rewardPerSec.mul(rewardTokenPricesInPNG[i]).div(ONE_TOKEN);
        extraRewardTokensPerSecondInPNG = extraRewardTokensPerSecondInPNG.add(rewardPerSecInPNG);
      }
    }

    let stakedPNG = ZERO;

    if ([token0, token1].includes(PNG_ADDRESS.toLowerCase())) {
      const pairValueInPNG = (await getBalance(PNG_ADDRESS, stakingTokenAddress)).mul(2);
      stakedPNG = pairValueInPNG.mul(pglStaked).div(pglTotalSupply);
    } else if ([token0, token1].includes(DAIe_ADDRESS.toLowerCase())) {
      const pairValueInDAI = (await getBalance(DAIe_ADDRESS, stakingTokenAddress)).mul(2);
      const adjustedPairValue = pairValueInDAI.mul(ONE_TOKEN).div(pngPrice);
      stakedPNG = adjustedPairValue.mul(pglStaked).div(pglTotalSupply);
    } else if ([token0, token1].includes(USDCe_ADDRESS.toLowerCase())) {
      const pairValueInUSDC = (await getBalance(USDCe_ADDRESS, stakingTokenAddress)).mul(2);
      const adjustedPairValue = expandTo18Decimals(pairValueInUSDC.mul(ONE_TOKEN).div(pngPrice), 6); // USDCe has 6 decimals
      stakedPNG = adjustedPairValue.mul(pglStaked).div(pglTotalSupply);
    } else if ([token0, token1].includes(USDTe_ADDRESS.toLowerCase())) {
      const pairValueInUSDT = (await getBalance(USDTe_ADDRESS, stakingTokenAddress)).mul(2);
      const adjustedPairValueInUSDT = expandTo18Decimals(
        pairValueInUSDT.mul(ONE_TOKEN).div(pngPrice),
        6,
      ); // USDTe has 6 decimals
      stakedPNG = adjustedPairValueInUSDT.mul(pglStaked).div(pglTotalSupply);
    } else if ([token0, token1].includes(WAVAX_ADDRESS.toLowerCase())) {
      const pairValueInWAVAX = (await getBalance(WAVAX_ADDRESS, stakingTokenAddress)).mul(2);
      const adjustedPairValue = pairValueInWAVAX.mul(avaxPrice).div(pngPrice);
      stakedPNG = adjustedPairValue.mul(pglStaked).div(pglTotalSupply);
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

    const fees = swapVolumeUSD.mul(365).div(days).mul(3).div(1000);
    const averageLiquidityUSD = liquidityUSD.div(days);
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

export const stakingTokenAddresses: Handler = async function (_) {
  const stakingTokenAddresses = await getStakingTokenAddressesFromMiniChefV2();
  return send(200, stakingTokenAddresses?.[0], {
    'Cache-Control': 'public,s-maxage=60',
  });
};

async function getDerivedAVAXFromToken(tokenAddress: string) {
  return gql.request(QUERIES.TOKEN_PRICE, {
    address: tokenAddress.toLowerCase(),
  });
}

function expandTo18Decimals(value: BigNumber, decimals: BigNumberish) {
  const scalar = TEN.pow(EIGHTEEN.sub(decimals));
  return value.mul(scalar);
}

function convertStringToBigNumber(
  input: string,
  inputDecimals: number,
  outputDecimals: number,
): BigNumber {
  const LEADING_ZERO_REGEX = /^0+/;
  const adjustedStringValue = Number.parseFloat(input)
    .toFixed(outputDecimals - inputDecimals)
    .replace('.', '')
    .replace(LEADING_ZERO_REGEX, '');
  return adjustedStringValue.length === 0 ? ZERO : BigNumber.from(adjustedStringValue);
}
