import {Chain, ChainId, CHAINS} from '@pangolindex/sdk';

export interface ChainInfo {
  chainId: string;
  png: string;
  wrapped_native_token: string;
  mini_chef: string;
  factory: string;
  community_treasury: string;
  treasury_vester: string;
  rpc: string;
  subgraph_exchange?: string;
}

export function getChainInfo(chainString: string | undefined): ChainInfo {
  if (chainString === undefined) chainString = ChainId.AVALANCHE.toString();

  let chainId: ChainId;

  if (chainString in ChainId) {
    chainId = Number(chainString);
  } else {
    throw new Error(`Chain ${chainString} is not yet supported`);
  }

  const chain: Chain = CHAINS[chainId];

  if (!chain.pangolin_is_live) {
    throw new Error(`Pangolin is not live on chain ${chainString}`);
  }

  const EMPTY = '';

  const chainInfo = {
    chainId: chain.chain_id?.toString() ?? EMPTY,
    png: chain.contracts?.png ?? EMPTY,
    wrapped_native_token: chain.contracts?.wrapped_native_token ?? EMPTY,
    mini_chef: chain.contracts?.mini_chef ?? EMPTY,
    factory: chain.contracts?.factory ?? EMPTY,

    community_treasury: chain.contracts?.community_treasury ?? EMPTY,
    treasury_vester: chain.contracts?.treasury_vester ?? EMPTY,

    rpc: chain.rpc_uri,
    subgraph_exchange: chain.subgraph?.exchange ?? undefined,
  };

  const missingInfos = Object.entries(chainInfo).filter(([k, v]) => v === EMPTY);

  if (missingInfos.length > 0) {
    const missingKeys = missingInfos.map(([k, v]) => k);
    throw new Error(`Missing chain info properties (${missingKeys.join(',')})`);
  }

  return chainInfo;
}
