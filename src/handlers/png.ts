import {BigNumber} from '@ethersproject/bignumber';
import type {Handler} from 'worktop';
import {send} from 'worktop/response';
import {getBalance, getTotalSupply} from '../utils/calls';
import {getChainInfo} from '../utils/chain';
import {adjustValueDecimals, scalar} from '../utils/conversion';
import * as gql from '../utils/gql';
import * as QUERIES from '../utils/queries';

export const tvl: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const result = await gql.request(
    QUERIES._FACTORY(chainInfo.factory),
    chainInfo.subgraph_exchange,
  );

  const text = Number.parseFloat(result.pangolinFactories[0].totalLiquidityUSD).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=300',
  });
};

export const volume: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const result = await gql.request(
    QUERIES._FACTORY(chainInfo.factory),
    chainInfo.subgraph_exchange,
  );

  const text = Number.parseFloat(result.pangolinFactories[0].totalVolumeUSD).toFixed(2);

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=300',
  });
};

export const supply: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let text;

  if (chainInfo.chainId === '43114') {
    // Override Avalanche total supply to account for TreasuryVesterProxy logical burns
    text = scalar(18).mul(230_000_000).toString();
  } else {
    const totalSupply = await getTotalSupply(chainInfo.rpc, chainInfo.png);
    text = totalSupply.toString();
  }

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=31536000,immutable',
  });
};

export const supplyWhole: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let text;

  if (chainInfo.chainId === '43114') {
    // Override Avalanche total supply to account for TreasuryVesterProxy logical burns
    text = BigNumber.from(230_000_000).toString();
  } else {
    const totalSupplyRaw = await getTotalSupply(chainInfo.rpc, chainInfo.png);
    const {decimals} = await gql.getTokenInfo(chainInfo.subgraph_exchange, chainInfo.png);
    text = adjustValueDecimals(totalSupplyRaw, decimals, 0).toString();
  }

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=31536000,immutable',
  });
};

export const circulating: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let text;

  if (chainInfo.chainId === '43114') {
    // Override Avalanche circulating supply to account for TreasuryVesterProxy logical burns
    text = scalar(18)
      .mul(538_000_000)
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.treasury_vester))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury))
      .toString();
  } else {
    text = (await getTotalSupply(chainInfo.rpc, chainInfo.png))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.treasury_vester))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury))
      .toString();
  }

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=86400',
  });
};

export const circulatingWhole: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let text;

  if (chainInfo.chainId === '43114') {
    // Override Avalanche circulating supply to account for TreasuryVesterProxy logical burns
    text = scalar(18)
      .mul(538_000_000)
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.treasury_vester))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury))
      .div(scalar(18))
      .toString();
  } else {
    const circulatingSupplyRaw = (await getTotalSupply(chainInfo.rpc, chainInfo.png))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.treasury_vester))
      .sub(await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury));
    const {decimals} = await gql.getTokenInfo(chainInfo.subgraph_exchange, chainInfo.png);
    text = adjustValueDecimals(circulatingSupplyRaw, decimals, 0).toString();
  }

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=86400',
  });
};

export const treasury: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const balance = await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury);
  const text = balance.toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=3600',
  });
};

export const treasuryWhole: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  const treasuryRaw = await getBalance(chainInfo.rpc, chainInfo.png, chainInfo.community_treasury);
  const {decimals} = await gql.getTokenInfo(chainInfo.subgraph_exchange, chainInfo.png);
  const text = adjustValueDecimals(treasuryRaw, decimals, 0).toString();

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=3600',
  });
};

export const priceUSD: Handler = async (_, context) => {
  const chainInfo = getChainInfo(context.params.chain);

  let text;

  try {
    const price = await gql.getTokenPriceUSD(chainInfo.subgraph_exchange, chainInfo.png);
    text = price.toString();
  } catch {
    throw new Error(`This method is not yet support on chain ${chainInfo.chainId}`);
  }

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=60',
  });
};
