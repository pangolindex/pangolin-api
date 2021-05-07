import * as QUERIES from '../utils/queries';
import {getAvaxPrice} from '../utils/price';
import {getSwapsNumber} from '../utils/swaps';
import * as gql from '../utils/gql';
import type {Handler} from 'worktop';
import {STAKING_ADDRESSES, WAVAX_ADDRESS, PNG_ADDRESS, WAVAX_PNG_ADDRESS} from '../utils/constants';
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
    const data = await gql.request(QUERIES.USER, {first: 1000, to_skip: number_skip});
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
  const result = await gql.request(QUERIES.SWAP, {
    first: 1,
    skip: Math.floor(swapCount / 2),
    orderBy: 'amountUSD',
  });
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

  const depositedBalance = await getBalance(stakingTokenAddress, stakingAddress);
  const totalSupply = await getTotalSupply(stakingTokenAddress);

  const [token0, token1] = await getPoolTokens(stakingTokenAddress);

  const [avaxBalance, pngBalance] = await Promise.all([
    await getBalance(WAVAX_ADDRESS, WAVAX_PNG_ADDRESS),
    await getBalance(PNG_ADDRESS, WAVAX_PNG_ADDRESS),
  ]);

  const stakedAVAX = [token0, token1].includes(WAVAX_ADDRESS)
    ? (await getBalance(WAVAX_ADDRESS, stakingTokenAddress))
        .mul(2)
        .mul(depositedBalance)
        .div(totalSupply)
    : (await getBalance(PNG_ADDRESS, stakingTokenAddress))
        .mul(2)
        .mul(avaxBalance)
        .div(pngBalance)
        .mul(depositedBalance)
        .div(totalSupply);

  const rewardRate = (await getRewardRate(stakingAddress))
    .mul(60 * 60 * 24 * 7 * 52)
    .mul(avaxBalance)
    .div(pngBalance)
    .mul(100)
    .div(stakedAVAX);

  response.send(200, rewardRate.toString());
};
