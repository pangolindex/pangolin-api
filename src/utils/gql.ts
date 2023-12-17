import * as QUERIES from './queries';

export async function getTokenPriceETH(url: string | undefined, address: string): Promise<string> {
  const response = await request(QUERIES.TOKEN_PRICE_ETH, url, {
    address: address.toLowerCase(),
  });
  return response.token.derivedETH;
}

export async function getTokenPriceUSD(url: string | undefined, address: string): Promise<string> {
  const response = await request(QUERIES.TOKEN_PRICE_USD, url, {
    address: address.toLowerCase(),
  });
  return response.token.derivedUSD;
}

export async function getTokenInfo(
  url: string | undefined,
  address: string,
): Promise<{ decimals: string; derivedETH: string }> {
  const response = await request(QUERIES.TOKEN_INFO, url, {
    address: address.toLowerCase(),
  });
  return {
    decimals: response.token.decimals,
    derivedETH: response.token.derivedETH,
  };
}

export async function getPairPriceUSD(url: string | undefined, address: string): Promise<string> {
  const response = await request(QUERIES.PAIR_VALUE, url, {
    address: address.toLowerCase(),
  });
  return response.pair.reserveUSD;
}

export async function getETHPrice(url: string | undefined): Promise<string> {
  const response = await request(QUERIES.AVAX_PRICE, url);
  return response.bundle.ethPrice;
}

interface CacheEntry {
  timestamp: number;
  data: any;
}

const gqlCache: Record<string, CacheEntry> = {};
const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5 minutes

export async function request(query: string, url: string | undefined, variables = {}) {
  if (url === undefined) {
    throw new Error(`Missing subgraph url`);
  }

  const cacheKey = `${url}|${query}|${JSON.stringify(variables)}`;
  const currentTime = Date.now();

  // Check if the cache contains a valid entry
  if (gqlCache[cacheKey] && currentTime - gqlCache[cacheKey].timestamp < CACHE_EXPIRE_TIME) {
    return gqlCache[cacheKey].data;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status !== 200) {
    const message = `[${response.statusText}]: Error querying ${query}`;
    console.error(message);
    throw new Error(message);
  }

  const { data } = await response.json();

  // Cache the new data with a timestamp
  gqlCache[cacheKey] = {
    timestamp: currentTime,
    data,
  };

  return data;
}
