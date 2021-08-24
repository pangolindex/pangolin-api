import type {Handler} from 'worktop';
import * as QUERIES from '../utils/queries';
import * as gql from '../utils/gql';
import {getPNGBalance} from '../utils/calls';
import {
  TOTAL_SUPPLY,
  ONE_TOKEN,
  TREASURY_VESTER_ADDRESS,
  COMMUNITY_TREASURY_ADDRESS,
} from '../constants';

// GET /png/tvl
export const tvl: Handler = async function (_, response) {
  const result = await gql.request(QUERIES.FACTORY);

  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end(parseFloat(result.pangolinFactories[0].totalLiquidityUSD).toFixed(2));
};

// GET /png/total-volume
export const volume: Handler = async function (_, response) {
  const result = await gql.request(QUERIES.FACTORY);

  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end(parseFloat(result.pangolinFactories[0].totalVolumeUSD).toFixed(2));
};

// GET /png/total-supply
export const supply: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=31536000,immutable');
  response.end(TOTAL_SUPPLY.toString());
};

// GET /png/total-supply-whole
export const supplyWhole: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=31536000,immutable');
  response.end(TOTAL_SUPPLY.div(ONE_TOKEN).toString());
};

// GET /png/circulating-supply
export const circulating: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end(
    TOTAL_SUPPLY.sub(await getPNGBalance(TREASURY_VESTER_ADDRESS))
      .sub(await getPNGBalance(COMMUNITY_TREASURY_ADDRESS))
      .toString(),
  );
};

// GET /png/circulating-supply-whole
export const circulatingWhole: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end(
    TOTAL_SUPPLY.sub(await getPNGBalance(TREASURY_VESTER_ADDRESS))
      .sub(await getPNGBalance(COMMUNITY_TREASURY_ADDRESS))
      .div(ONE_TOKEN)
      .toString(),
  );
};

// GET /png/community-treasury
export const treasury: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end((await getPNGBalance(COMMUNITY_TREASURY_ADDRESS)).toString());
};

// GET /png/community-treasury-whole
export const treasuryWhole: Handler = async function (_, response) {
  response.setHeader('Cache-Control', 'public,s-maxage=30');
  response.end((await getPNGBalance(COMMUNITY_TREASURY_ADDRESS)).div(ONE_TOKEN).toString());
};
