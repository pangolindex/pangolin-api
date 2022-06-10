import * as QUERIES from './queries';

export async function getTokenPriceETH(url: string, address: string): Promise<string> {
  const response = await request(QUERIES.TOKEN_PRICE, url, {
    address: address.toLowerCase(),
  });
  return response.token.derivedETH;
}

export async function getPairPriceUSD(url: string, address: string): Promise<string> {
  const response = await request(QUERIES.PAIR_VALUE, url, {
    address: address.toLowerCase(),
  });
  return response.pair.reserveUSD;
}

export async function getETHPrice(url: string): Promise<string> {
  const response = await request(QUERIES.AVAX_PRICE, url);
  return response.bundle.ethPrice;
}

export async function request(query: string, url: string, variables = {}) {
  const _ = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (_.status !== 200) {
    const msg = `[${_.statusText}]: Error querying ${query}`;
    console.error(msg);
    throw new Error(msg);
  }

  const {data} = await _.json();

  return data;
}
