import * as QUERIES from '../utils/queries';
import {getAvaxPrice} from '../utils/price';
import {getSwapsNumber} from '../utils/swaps';
import * as gql from '../utils/gql';
import type {Handler} from 'worktop';

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
