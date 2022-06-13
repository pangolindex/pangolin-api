import {Interface, Result} from '@ethersproject/abi';
import {BigNumber} from '@ethersproject/bignumber';
import {hexStripZeros, hexZeroPad} from '@ethersproject/bytes';
import {ERC20_ABI, MINICHEF_ABI, PAIR_ABI, REWARDER_VIA_MULTIPLIER_ABI} from '../constants';

export function normalizeAddress(address: string): string {
  return hexZeroPad(hexStripZeros(address), 20);
}

const getStakingTokenAddressFromMiniChefV2Cache: Record<string, string> = {};
export async function getStakingTokenAddressFromMiniChefV2(
  rpc: string,
  chefAddress: string,
  pid: string,
): Promise<string> {
  const key = `${rpc}${chefAddress}${pid}`;

  let result: string = getStakingTokenAddressFromMiniChefV2Cache[key];
  if (result !== undefined) return result;

  result = normalizeAddress(await call(rpc, MINICHEF_ABI, chefAddress, 'lpToken', [pid]));

  getStakingTokenAddressFromMiniChefV2Cache[key] = result;
  return result;
}

export async function getStakingTokenAddressesFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<Result> {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(rpc, MINICHEF_ABI, chefAddress, 'lpTokens');
  return iface.decodeFunctionResult('lpTokens', response);
}

export async function getRewardPerSecondFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, MINICHEF_ABI, chefAddress, 'rewardPerSecond'));
}

export async function getPoolInfoFromMiniChefV2(
  rpc: string,
  chefAddress: string,
  pid: string,
): Promise<Result> {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(rpc, MINICHEF_ABI, chefAddress, 'poolInfo', [pid]);
  return iface.decodeFunctionResult('poolInfo', response);
}

export async function getPoolInfosFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<
  Array<{accRewardPerShare: BigNumber; lastRewardTime: BigNumber; allocPoint: BigNumber}>
> {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(rpc, MINICHEF_ABI, chefAddress, 'poolInfos');
  const decoded = iface.decodeFunctionResult('poolInfos', response);
  return (decoded[0] as BigNumber[][]).map((data: BigNumber[]) => ({
    accRewardPerShare: data[0],
    lastRewardTime: data[1],
    allocPoint: data[2],
  }));
}

export async function getRewarder(rpc: string, chefAddress: string, pid: string): Promise<string> {
  return normalizeAddress(await call(rpc, MINICHEF_ABI, chefAddress, 'rewarder', [pid]));
}

export async function getTotalAllocationPointsFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, MINICHEF_ABI, chefAddress, 'totalAllocPoint'));
}

export async function getRewarderViaMultiplierGetRewardTokens(
  rpc: string,
  rewarderAddress: string,
): Promise<string[]> {
  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(rpc, REWARDER_VIA_MULTIPLIER_ABI, rewarderAddress, 'getRewardTokens');
  const decoded = iface.decodeFunctionResult('getRewardTokens', response);
  return decoded[0].map((address: string) => normalizeAddress(address)); // eslint-disable-line
}

export async function getRewarderViaMultiplierPendingTokens(
  rpc: string,
  rewarderAddress: string,
  user: string,
  rewardAmount: string,
): Promise<Result> {
  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(rpc, REWARDER_VIA_MULTIPLIER_ABI, rewarderAddress, 'pendingTokens', [
    0,
    user,
    rewardAmount,
  ]);
  return iface.decodeFunctionResult('pendingTokens', response);
}

export async function getTotalSupply(rpc: string, address: string): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, ERC20_ABI, address, 'totalSupply'));
}

const getDecimalsCache: Record<string, BigNumber> = {};
export async function getDecimals(rpc: string, address: string): Promise<BigNumber> {
  const key = `${rpc}${address}`;

  let result: BigNumber = getDecimalsCache[key];
  if (result !== undefined) return result;

  result = BigNumber.from(await call(rpc, ERC20_ABI, address, 'decimals'));

  getDecimalsCache[key] = result;
  return result;
}

const getPoolTokensCache: Record<string, [string, string]> = {};
export async function getPoolTokens(rpc: string, address: string): Promise<[string, string]> {
  const key = `${rpc}${address}`;

  let result: [string, string] = getPoolTokensCache[key];
  if (result !== undefined) return result;

  const [token0, token1] = await Promise.all<string>([
    call(rpc, PAIR_ABI, address, 'token0'),
    call(rpc, PAIR_ABI, address, 'token1'),
  ]);

  result = [normalizeAddress(token0), normalizeAddress(token1)];

  getPoolTokensCache[key] = result;
  return result;
}

export async function getBalance(rpc: string, erc20: string, address: string): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, ERC20_ABI, erc20, 'balanceOf', [address]));
}

export async function call(
  rpc: string,
  abi: any[],
  toAddress: string,
  functionName: string,
  functionData: any[] = [],
) {
  const iface = new Interface(abi);

  const _ = await fetch(rpc, {
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

  if (_.status !== 200) {
    const message = `[${_.statusText}]: Error fetching ${toAddress}.${functionName}(...)`;
    console.error(message);
    throw new Error(message);
  }

  const {result} = await _.json();

  return result;
}
