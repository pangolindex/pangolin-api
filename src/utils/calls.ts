import {BigNumber} from '@ethersproject/bignumber';
import {Interface} from '@ethersproject/abi';
import {hexStripZeros, hexZeroPad} from '@ethersproject/bytes';
import {RPC_URL, ERC20_ABI, STAKING_REWARDS_ABI, PNG_ADDRESS, PAIR_ABI} from './constants';

export function normalizeAddress(address: string) {
  return hexZeroPad(hexStripZeros(address), 20);
}

export async function getStakingTokenAddress(address: string) {
  const {result} = await call(STAKING_REWARDS_ABI, address, 'stakingToken', []);

  return normalizeAddress(result);
}

export async function getRewardRate(address: string) {
  const {result} = await call(STAKING_REWARDS_ABI, address, 'rewardRate', []);

  return BigNumber.from(result);
}

export async function getPNGBalance(address: string) {
  return getBalance(PNG_ADDRESS, address);
}

export async function getTotalSupply(address: string) {
  const {result} = await call(ERC20_ABI, address, 'totalSupply', []);

  return BigNumber.from(result);
}

export async function getPoolTokens(address: string) {
  const [token0, token1] = await Promise.all([
    call(PAIR_ABI, address, 'token0', []),
    call(PAIR_ABI, address, 'token1', []),
  ]);

  return [normalizeAddress(token0.result), normalizeAddress(token1.result)];
}

export async function getBalance(erc20: string, address: string) {
  const {result} = await call(ERC20_ABI, erc20, 'balanceOf', [address]);

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
