import type {Handler} from 'worktop';
import {send} from 'worktop/response';
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
export const tvl: Handler = async function () {
  const result = await gql.request(QUERIES.FACTORY);

  const text = Number.parseFloat(result.pangolinFactories[0].totalLiquidityUSD).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /png/total-volume
export const volume: Handler = async function () {
  const result = await gql.request(QUERIES.FACTORY);

  const text = Number.parseFloat(result.pangolinFactories[0].totalVolumeUSD).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /png/total-supply
export const supply: Handler = async function () {
  const text = TOTAL_SUPPLY.toString();
  return send(200, text, {
    'Cache-Control': 'public,s-maxage=31536000,immutable',
  });
};

// GET /png/total-supply-whole
export const supplyWhole: Handler = async function () {
  const text = TOTAL_SUPPLY.div(ONE_TOKEN).toString();
  return send(200, text, {
    'Cache-Control': 'public,s-maxage=31536000,immutable',
  });
};

// GET /png/circulating-supply
export const circulating: Handler = async function () {
  const text = TOTAL_SUPPLY.sub(await getPNGBalance(TREASURY_VESTER_ADDRESS))
    .sub(await getPNGBalance(COMMUNITY_TREASURY_ADDRESS))
    .toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /png/circulating-supply-whole
export const circulatingWhole: Handler = async function () {
  const text = TOTAL_SUPPLY.sub(await getPNGBalance(TREASURY_VESTER_ADDRESS))
    .sub(await getPNGBalance(COMMUNITY_TREASURY_ADDRESS))
    .div(ONE_TOKEN)
    .toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /png/community-treasury
export const treasury: Handler = async function () {
  const text = (await getPNGBalance(COMMUNITY_TREASURY_ADDRESS)).toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};

// GET /png/community-treasury-whole
export const treasuryWhole: Handler = async function () {
  const text = (await getPNGBalance(COMMUNITY_TREASURY_ADDRESS)).div(ONE_TOKEN).toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=30',
  });
};
