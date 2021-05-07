import type {Handler} from 'worktop';
import {getAvaxPrice} from '../utils/price';
import * as QUERIES from '../utils/queries';
import * as gql from '../utils/gql';
import {balanceOf} from '../utils/calls';
import {
  TOTAL_SUPPLY,
  ONE_TOKEN,
  TREASURY_VESTER_ADDRESS,
  COMMUNITY_TREASURY_ADDRESS,
} from '../utils/constants';

// GET /png/tvl
export const tvl: Handler = async function (_, response) {
  const [result, avaxPrice] = await Promise.all([gql.request(QUERIES.FACTORY), getAvaxPrice()]);

  response.end((result.pangolinFactories[0].totalLiquidityETH * avaxPrice).toFixed(2));
};

// GET /png/total-volume
export const volume: Handler = async function (_, response) {
  const [result, avaxPrice] = await Promise.all([gql.request(QUERIES.FACTORY), getAvaxPrice()]);

  response.end((result.pangolinFactories[0].totalVolumeETH * avaxPrice).toFixed(2));
};

// GET /png/total-supply
export const supply: Handler = async function (_, response) {
  response.end(TOTAL_SUPPLY.toString());
};

// GET /png/total-supply-whole
export const supplyWhole: Handler = async function (_, response) {
  response.end(TOTAL_SUPPLY.div(ONE_TOKEN).toString());
};

// GET /png/circulating-supply
export const circulating: Handler = async function (_, response) {
  response.end(
    TOTAL_SUPPLY.sub(await balanceOf(TREASURY_VESTER_ADDRESS))
      .sub(await balanceOf(COMMUNITY_TREASURY_ADDRESS))
      .toString(),
  );
};

// GET /png/circulating-supply-whole
export const circulatingWhole: Handler = async function (_, response) {
  response.end(
    TOTAL_SUPPLY.sub(await balanceOf(TREASURY_VESTER_ADDRESS))
      .sub(await balanceOf(COMMUNITY_TREASURY_ADDRESS))
      .div(ONE_TOKEN)
      .toString(),
  );
};

// GET /png/community-treasury
export const treasury: Handler = async function (_, response) {
  response.end((await balanceOf(COMMUNITY_TREASURY_ADDRESS)).toString());
};

// GET /png/community-treasury-whole
export const treasuryWhole: Handler = async function (_, response) {
  response.end((await balanceOf(COMMUNITY_TREASURY_ADDRESS)).div(ONE_TOKEN).toString());
};
