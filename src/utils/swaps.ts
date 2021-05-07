import * as gql from './gql';
import * as QUERIES from './queries';

export async function getSwapsNumber(i = 0, j = 100000): Promise<number> {
  const {swaps} = await gql.request(QUERIES.SWAP, {skip: j});
  const is_swaps: number = swaps.length > 0 ? swaps.length : 0;

  if ((is_swaps < 100 && is_swaps > 0) || j === 0) {
    return j + is_swaps;
  }

  return is_swaps
    ? getSwapsNumber(j, j + (j - i) * 2)
    : getSwapsNumber(i, Math.floor(j - (j - i) / 2));
}