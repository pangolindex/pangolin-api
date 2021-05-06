import {BigNumber} from '@ethersproject/bignumber';
import {PNG_ADDRESS, RPC_URL} from './constants';

export async function balanceOf(address: string) {
  const _ = await fetch(RPC_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: PNG_ADDRESS,
          data: `0x70a08231000000000000000000000000${address.slice(2)}`,
        },
        'latest',
      ],
    }),
  });

  const {result} = await _.json();

  return BigNumber.from(result);
}
