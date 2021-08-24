import type {Handler} from 'worktop';
import * as QUERIES from '../utils/queries';
import * as gql from '../utils/gql';
import {STAKING_ADDRESSES, WAVAX_ADDRESS, PNG_ADDRESS, WAVAX_PNG_ADDRESS} from '../constants';
import {
  getStakingTokenAddress,
  getBalance,
  getTotalSupply,
  getPoolTokens,
  getRewardRate,
} from '../utils/calls';

// GET /pangolin/addresses
export const addresses: Handler = async function (_, response) {
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

  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end(`${number_addresses}`);
};

// GET /pangolin/transaction-average
export const average: Handler = async function (_, response) {
  const result = await gql.request(QUERIES.FACTORY);
  const {totalVolumeUSD, txCount} = result.pangolinFactories[0];

  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end((parseFloat(totalVolumeUSD) / parseInt(txCount)).toFixed(2));
};

// GET /pangolin/transaction-median
// export const median: Handler = async function (_, response) {};

// GET /pangolin/apr/:address
export const apr: Handler = async function (request, response) {
  try {
    const stakingAddress = request.params.address;

    if (!STAKING_ADDRESSES.includes(stakingAddress)) {
      response.end('0');
      return;
    }

    const stakingTokenAddress = await getStakingTokenAddress(stakingAddress);

    // How much PGL is staked
    const poolTokenBalance = await getBalance(stakingTokenAddress, stakingAddress);

    // Total PGL supply
    const poolTokenSupply = await getTotalSupply(stakingTokenAddress);

    // Get the two token addresses in the pool
    const [token0, token1] = await getPoolTokens(stakingTokenAddress);

    // Get how much AVAX and PNG are in the AVAX-PNG pool
    const [pooledAVAX, pooledPNG] = await Promise.all([
      await getBalance(WAVAX_ADDRESS, WAVAX_PNG_ADDRESS),
      await getBalance(PNG_ADDRESS, WAVAX_PNG_ADDRESS),
    ]);

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

    const rewardRate = (await getRewardRate(stakingAddress))
      // Reward rate is per second
      .mul(60 * 60 * 24 * 7 * 52)
      // Convert to AVAX
      .mul(pooledAVAX)
      .div(pooledPNG)
      // Percentage
      .mul(100)
      // Divide by amount staked to get APR
      .div(stakedAVAX);

    response.setHeader('Cache-Control', 'public,s-maxage=30');
    response.send(200, rewardRate.toString());
  } catch {
    response.send(200, 0);
  }
};
