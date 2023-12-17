import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { hexStripZeros, hexZeroPad } from '@ethersproject/bytes';
import { ERC20_ABI, MINICHEF_ABI, REWARDER_VIA_MULTIPLIER_ABI } from '../constants';
import { CloudflareWorkerKV, PoolInfo } from './interfaces';

export function normalizeAddress(address: string): string {
  return hexZeroPad(hexStripZeros(address), 20);
}

export async function getStakingTokenAddressFromMiniChefV2(
  rpc: string,
  chefAddress: string,
  pid: string,
): Promise<string> {
  const key = `${rpc}|${chefAddress}|${pid}`;

  // @ts-expect-error CHEF_LP_TOKENS is a CloudFlare KV object
  const cached: string = await (CHEF_LP_TOKENS as CloudflareWorkerKV).get(key);
  if (cached !== null) return cached;

  const result = normalizeAddress(await call(rpc, MINICHEF_ABI, chefAddress, 'lpToken', [pid]));

  // @ts-expect-error CHEF_LP_TOKENS is a CloudFlare KV object
  await (CHEF_LP_TOKENS as CloudflareWorkerKV).put(key, result);
  return result;
}

export async function getStakingTokenAddressesFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<string[]> {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(rpc, MINICHEF_ABI, chefAddress, 'lpTokens');
  const decoded = iface.decodeFunctionResult('lpTokens', response);
  return decoded[0].map((address: string) => normalizeAddress(address)); // eslint-disable-line
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
): Promise<PoolInfo> {
  const iface = new Interface(MINICHEF_ABI);
  const response = await call(rpc, MINICHEF_ABI, chefAddress, 'poolInfo', [pid]);
  const decoded = iface.decodeFunctionResult('poolInfo', response);
  return {
    accRewardPerShare: decoded[0],
    lastRewardTime: decoded[1],
    allocPoint: decoded[2],
  };
}

export async function getPoolInfosFromMiniChefV2(
  rpc: string,
  chefAddress: string,
): Promise<PoolInfo[]> {
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

export async function getRewarderViaMultiplierRewardTokens(
  rpc: string,
  rewarderAddress: string,
): Promise<string[]> {
  const key = `${rpc}|${rewarderAddress}|REWARDS`;

  // @ts-expect-error REWARDER_VIA_MULTIPLIER is a CloudFlare KV object
  const cached: string = await (REWARDER_VIA_MULTIPLIER as CloudflareWorkerKV).get(key);
  if (cached !== null) return JSON.parse(cached);

  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(rpc, REWARDER_VIA_MULTIPLIER_ABI, rewarderAddress, 'getRewardTokens');
  const decoded = iface.decodeFunctionResult('getRewardTokens', response);
  const result = decoded[0].map((address: string) => normalizeAddress(address)); // eslint-disable-line

  // @ts-expect-error REWARDER_VIA_MULTIPLIER is a CloudFlare KV object
  await (REWARDER_VIA_MULTIPLIER as CloudflareWorkerKV).put(key, JSON.stringify(result));
  return result;
}

export async function getRewarderViaMultiplierRewardMultipliers(
  rpc: string,
  rewarderAddress: string,
): Promise<BigNumber[]> {
  const key = `${rpc}|${rewarderAddress}|MULTIPLIERS`;

  // @ts-expect-error REWARDER_VIA_MULTIPLIER is a CloudFlare KV object
  const cached: string = await (REWARDER_VIA_MULTIPLIER as CloudflareWorkerKV).get(key);
  if (cached !== null) return JSON.parse(cached);

  const iface = new Interface(REWARDER_VIA_MULTIPLIER_ABI);
  const response = await call(
    rpc,
    REWARDER_VIA_MULTIPLIER_ABI,
    rewarderAddress,
    'getRewardMultipliers',
  );
  const decoded = iface.decodeFunctionResult('getRewardMultipliers', response);
  const result = decoded[0];

  // @ts-expect-error REWARDER_VIA_MULTIPLIER is a CloudFlare KV object
  await (REWARDER_VIA_MULTIPLIER as CloudflareWorkerKV).put(key, JSON.stringify(result));
  return result;
}

export async function getTotalSupply(rpc: string, address: string): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, ERC20_ABI, address, 'totalSupply'));
}

export async function getBalance(rpc: string, erc20: string, address: string): Promise<BigNumber> {
  return BigNumber.from(await call(rpc, ERC20_ABI, erc20, 'balanceOf', [address]));
}

interface CacheEntry {
  timestamp: number;
  data: any;
}

const rpcCache: Record<string, CacheEntry> = {};
const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5 minutes

export async function call(
  rpc: string,
  abi: any[],
  toAddress: string,
  functionName: string,
  functionData: any[] = [],
) {
  const iface = new Interface(abi);
  const cacheKey = `${rpc}|${toAddress}|${functionName}|${JSON.stringify(functionData)}`;
  const currentTime = Date.now();

  // Check if the cache contains a valid entry
  if (rpcCache[cacheKey] && currentTime - rpcCache[cacheKey].timestamp < CACHE_EXPIRE_TIME) {
    return rpcCache[cacheKey].data;
  }

  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  if (response.status !== 200) {
    const message = `[${response.statusText}]: Error fetching ${toAddress}.${functionName}(...)`;
    console.error(message);
    throw new Error(message);
  }

  const { result } = await response.json();

  // Cache the new data with a timestamp
  rpcCache[cacheKey] = {
    timestamp: currentTime,
    data: result,
  };

  return result;
}
