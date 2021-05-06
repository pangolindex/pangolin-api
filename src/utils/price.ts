export async function getAvaxPrice() {
  const _ = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd',
  );

  const {
    'avalanche-2': {usd},
  } = await _.json();

  return usd;
}
