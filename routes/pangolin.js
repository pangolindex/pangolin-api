const { ethers, BigNumber } = require("ethers");
const gql = require('graphql-request').gql;
const GraphQLClient = require('graphql-request').GraphQLClient;
const CoinGecko = require('coingecko-api');

const express = require('express');
const router = express.Router();

// Setup GraphQL Queries
const client = new GraphQLClient('https://graph-node.avax.network/subgraphs/name/dasconnor/pangolindex', { headers: {} });
const factoryQuery = gql`query pangolinFactories {
  pangolinFactories(
   where: { id: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88" }) {
    id
    totalVolumeETH
    totalLiquidityETH
    txCount
    pairCount
  }
}`;

const userQuery = gql`query users($first: Int, $to_skip: Int) {
  users(first: $first, skip: $to_skip) {
    id
  }
}`;

const txQuery = gql`
  query transactions {
    transactions(first: 100, orderBy: timestamp, orderDirection: desc) {
      swaps(orderBy: timestamp, orderDirection: desc) {
        amountUSD
      }
    }
  }`;

let swapQuery = gql`
  query swaps($first: Int, $skip: Int) {
    swaps(where: {}, first: $first, skip: $skip) {
        amountUSD
      }
  }`;

// Connect to CoinGeckoAPI
const coinGeckoClient = new CoinGecko();

/**
 * Queries current AVAX price from CoinGecko
 * @returns current AVAX price in USD
 */
 async function getAvaxPrice() {
  const result = await coinGeckoClient.simple.price({
    ids: ['avalanche-2'],
    vs_currencies: ['usd']
  })

  return result['data']['avalanche-2']['usd']
}

/**
 * Cacluculate the total number of addresses that have used Pangolin
 */
async function calcAddresses() {
  let num_addresses = 0
  let num_skip = 0;
  let new_addrs = 0;
  do {
    let query_vars = {
      first: 1000,
      to_skip: num_skip
    }
    let result = await client.request(userQuery, query_vars)
    new_addrs = result['users'].length
    num_addresses = num_addresses + new_addrs
    num_skip = num_skip + 1000
   } while (new_addrs == 1000)

  return num_addresses;
}

/**
 * Helper to discover number of swap transactions
 */
async function getSwapsNumber(i = 0, j = 100000) {
  let { swaps } = await client.request(swapQuery, { skip: j });
  let is_swaps = (swaps.length) ? swaps.length : 0;

  if((is_swaps < 100 && is_swaps > 0) || j === 0) {
    return j + is_swaps;
  } else {
    return is_swaps ? await getSwapsNumber(j, (j + ((j-i) * 2))) : await getSwapsNumber(i, Math.floor((j - ((j-i) / 2))));
  }
}

/**
 * Calculate average swap transactions on USD
 */
async function calcAvg() {
  let result = await client.request(factoryQuery);
  let totalVolumeETH = result['pangolinFactories'][0]['totalVolumeETH'];
  let avaxPrice = await getAvaxPrice();
  let swapCount = await getSwapsNumber();
  let avg = totalVolumeETH / swapCount;
  let avgUSD = avg * avaxPrice;

  return avgUSD;
}

// WIP not correct, also need swap count, not tx count
async function calcMedian() {

  let result = await client.request(factoryQuery)

  let txCount = result['pangolinFactories'][0]['txCount']

  let medianIndex = Math.round(txCount / 2)

}



/**
 *  GET the number of addresses who have used Pangolin
 */
router.get('/addresses', function(req, res, next) {
  calcAddresses().then(function (addresses) {
    res.send(addresses.toString());
  })
  .catch(next);
});

/**
 *  GET the average swap value in USD
 */
 router.get('/transaction-average', function(req, res, next) {
  calcAvg().then(function (avg) {
    res.send(avg.toFixed(2).toString());
  })
  .catch(next);
});

/**
 *  GET the median swap value in USD
 */
 router.get('/transaction-median', function(req, res, next) {
  calcMedian().then(function (avg) {
    res.send(avg.toFixed(2).toString());
  })
  .catch(next);
});

module.exports = router;
