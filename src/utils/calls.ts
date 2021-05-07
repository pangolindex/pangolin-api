import {BigNumber} from '@ethersproject/bignumber';
import {Interface} from '@ethersproject/abi';
import {PNG_ADDRESS, RPC_URL, ERC20_ABI} from './constants';

export async function balanceOf(address: string) {
  const {result} = await call(ERC20_ABI, PNG_ADDRESS, 'balanceOf', [address]);

  return BigNumber.from(result);
}

export async function call(
  abi: any[],
  toAddress: string,
  functionName: string,
  functionData: any[],
) {
  const iface = new Interface(abi);

  const _ = await fetch(RPC_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: toAddress,
          data: iface.encodeFunctionData(functionName, functionData),
        },
        'latest',
      ],
    }),
  });

  return _.json();
}
