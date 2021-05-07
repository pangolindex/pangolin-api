import {BigNumber} from '@ethersproject/bignumber';
import {Interface} from '@ethersproject/abi';
import {PNG_ADDRESS, RPC_URL, ERC20_ABI} from './constants';

export async function balanceOf(address: string) {
  const iface = new Interface(ERC20_ABI);

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
          data: iface.encodeFunctionData('balanceOf', [address]),
        },
        'latest',
      ],
    }),
  });

  const {result} = await _.json();

  return BigNumber.from(result);
}
