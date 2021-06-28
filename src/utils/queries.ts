import {FACTORY_ADDRESS} from '../constants';

export const FACTORY = `
query pangolinFactories {
	pangolinFactories(where: { id: "${FACTORY_ADDRESS}" }) {
		id
		totalVolumeETH
		totalLiquidityETH
		txCount
		pairCount
	}
}`;

export const USER = `
query users($first: Int, $firstUser: String, $orderBy: String) {
  users(first: $first, where: { id_gt : $firstUser }, orderBy: $orderBy) {
    id
  }
}`;

export const SWAP = `
query swaps($first: Int, $skip: Int, $orderBy: String) {
	swaps(where: {}, first: $first, skip: $skip, orderBy: $orderBy) {
		amountUSD
	}
}`;
