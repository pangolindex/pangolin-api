export const GRAPH_URL = 'https://graph-node.avax.network/subgraphs/name/dasconnor/pangolindex';
export const RPC_URL = 'https://api.avax.network/ext/bc/C/rpc';

export const PNG_ADDRESS = '0x60781C2586D68229fde47564546784ab3fACA982';
export const FACTORY_ADDRESS = '0xefa94DE7a4656D787667C749f7E1223D71E9FD88';
export const TREASURY_VESTER_ADDRESS = '0x6747AC215dAFfeE03a42F49FebB6ab448E12acEe';
export const COMMUNITY_TREASURY_ADDRESS = '0x650f5865541f6D68BdDFE977dB933C293EA72358';

import {BigNumber} from '@ethersproject/bignumber';
export const ONE_TOKEN = BigNumber.from('1000000000000000000');
export const TOTAL_SUPPLY = ONE_TOKEN.mul(538000000);

export const ERC20_ABI = ['function balanceOf(address) view returns (uint)'];
