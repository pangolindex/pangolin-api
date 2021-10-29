import type {Handler} from 'worktop';
import {send} from 'worktop/response';
import * as QUERIES from '../utils/queries';
import * as gql from '../utils/gql';
import {STAKING_ADDRESSES, WAVAX_ADDRESS, PNG_ADDRESS, WAVAX_PNG_ADDRESS, ZERO} from '../constants';
import {
  getStakingTokenAddress,
  getBalance,
  getTotalSupply,
  getPoolTokens,
  getRewardRate,
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
          .mul(60 * 60 * 24 * 7 * 52)
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
