import {BigNumber} from '@ethersproject/bignumber';

export interface CloudflareWorkerKV {
  get(key: string, type?: 'text'): Promise<string>;
  get(key: string, type: 'json'): Promise<any>;

  put(
    key: string,
    value: string | ReadableStream | ArrayBuffer | FormData,
    options?: CloudflareWorkerKVOptions,
  ): Promise<void>;

  delete(key: string): Promise<void>;
}

export interface CloudflareWorkerKVOptions {
  expiration?: number;
  expirationTtl?: number;
}

export interface PoolInfo {
  accRewardPerShare: BigNumber;
  lastRewardTime: BigNumber;
  allocPoint: BigNumber;
}

export interface AprResponse {
  swapFeeApr: number;
  stakingApr: number;
  combinedApr: number;
}
