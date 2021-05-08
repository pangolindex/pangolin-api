import * as QUERIES from '../utils/queries';
import {getAvaxPrice} from '../utils/price';
import {getSwapsNumber} from '../utils/swaps';
import * as gql from '../utils/gql';
import type {Handler} from 'worktop';
import {
  STAKING_ADDRESSES,
  WAVAX_ADDRESS,
  DEPRECATED_GRAPH_URL,
  PNG_ADDRESS,
  WAVAX_PNG_ADDRESS,
} from '../utils/constants';
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
  let number_skip = 0;
  let new_addrs = 0;
  do {
    // eslint-disable-next-line no-await-in-loop
    const data = await gql.request(
      QUERIES.USER,
      {first: 1000, to_skip: number_skip},
      DEPRECATED_GRAPH_URL,
    );
    if (data === undefined) {
      break;
    }

    new_addrs = data.users.length;
    number_addresses += new_addrs;
    number_skip += 1000;
  } while (new_addrs === 1000);

  response.end(`${number_addresses}`);
};

// GET /pangolin/transaction-average
export const average: Handler = async function (_, response) {
  const [avaxPrice, swapCount] = await Promise.all([getAvaxPrice(), getSwapsNumber()]);
  const totalVolumeETH = (await gql.request(QUERIES.FACTORY)).pangolinFactories[0].totalVolumeETH;

  response.end(((avaxPrice * totalVolumeETH) / swapCount).toFixed(2));
};

// GET /pangolin/transaction-median
export const median: Handler = async function (_, response) {
  const [avaxPrice, swapCount] = await Promise.all([getAvaxPrice(), getSwapsNumber()]);
  const result = await gql.request(
    QUERIES.SWAP,
    {
      first: 1,
      skip: Math.floor(swapCount / 2),
      orderBy: 'amountUSD',
    },
    DEPRECATED_GRAPH_URL,
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const median = Number.parseFloat(result.swaps[0].amountUSD);

  response.end((median * avaxPrice).toFixed(2));
};

// GET /pangolin/apr/:address
export const apr: Handler = async function (request, response) {
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

  response.send(200, rewardRate.toString());
};
