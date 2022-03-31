import {BigNumber} from '@ethersproject/bignumber';
import {Interface} from '@ethersproject/abi';
import {hexStripZeros, hexZeroPad} from '@ethersproject/bytes';
import {
  RPC_URL,
  ERC20_ABI,
  STAKING_REWARDS_ABI,
  MINICHEF_ABI,
  PNG_ADDRESS,
  PAIR_ABI,
  MINICHEFV2_ADDRESS,
  REWARDER_VIA_MULTIPLIER_ABI,
} from '../constants';

export function normalizeAddress(address: string) {
  return hexZeroPad(hexStripZeros(address), 20);
}

export async function getStakingTokenAddress(address: string) {
  return normalizeAddress(await call(STAKING_REWARDS_ABI, address, 'stakingToken'));
}

export async function getStakingTokenAddressFromMiniChefV2(pid: string) {
  return normalizeAddress(await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'lpToken', [pid]));
}

export async function getStakingTokenAddressesFromMiniChefV2() {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'lpTokens');
  return iface.decodeFunctionResult('lpTokens', response);
}

export async function getRewardRate(address: string) {
  return BigNumber.from(await call(STAKING_REWARDS_ABI, address, 'rewardRate'));
}

export async function getRewardPerSecondFromMiniChefV2() {
  return BigNumber.from(await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'rewardPerSecond'));
}

export async function getPoolInfoFromMiniChefV2(pid: string) {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'poolInfo', [pid]);
  return iface.decodeFunctionResult('poolInfo', response);
}

export async function getRewarder(pid: string) {
  return normalizeAddress(await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'rewarder', [pid]));
}

export async function getTotalAllocationPointsFromMiniChefV2() {
  return BigNumber.from(await call(MINICHEF_ABI, MINICHEFV2_ADDRESS, 'totalAllocPoint'));
}

export async function getRewarderViaMultiplierGetRewardTokens(rewarderAddress: string) {
  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(REWARDER_VIA_MULTIPLIER_ABI, rewarderAddress, 'getRewardTokens');
  const decoded = iface.decodeFunctionResult('getRewardTokens', response);
  return decoded[0].map((address: string) => normalizeAddress(address)); // eslint-disable-line
}

export async function getRewarderViaMultiplierPendingTokens(
  rewarderAddress: string,
  user: string,
  rewardAmount: string,
) {
  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(REWARDER_VIA_MULTIPLIER_ABI, rewarderAddress, 'pendingTokens', [
    0,
    user,
    rewardAmount,
  ]);
  return iface.decodeFunctionResult('pendingTokens', response);
}

export async function getPNGBalance(address: string) {
  return getBalance(PNG_ADDRESS, address);
}

export async function getTotalSupply(address: string) {
  return BigNumber.from(await call(ERC20_ABI, address, 'totalSupply'));
}

export async function getDecimals(address: string) {
  return BigNumber.from(await call(ERC20_ABI, address, 'decimals'));
}

export async function getPoolTokens(address: string) {
  const [token0, token1] = await Promise.all([
    call(PAIR_ABI, address, 'token0'),
    call(PAIR_ABI, address, 'token1'),
  ]);

  return [normalizeAddress(token0), normalizeAddress(token1)];
}

export async function getBalance(erc20: string, address: string) {
  return BigNumber.from(await call(ERC20_ABI, erc20, 'balanceOf', [address]));
}

export async function call(
  abi: any[],
  toAddress: string,
  functionName: string,
  functionData: any[] = [],
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

  const {result} = await _.json();

  return result;
}
