const { ethers, BigNumber } = require("ethers");
const gql = require('graphql-request').gql;
const GraphQLClient = require('graphql-request').GraphQLClient;
const CoinGecko = require('coingecko-api');

const express = require('express');
const router = express.Router();

// Setup GraphQL Queries
const client = new GraphQLClient('https://api.thegraph.com/subgraphs/name/dasconnor/pangolin-dex', { headers: {} });
const queryLimit = 1000;
const skipLimit = 5000;
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

const userQuery = gql`query users($first: Int, $firstUser: String, $orderBy: String) {
  users(first: $first, where: { id_gt : $firstUser }, orderBy: $orderBy) {
    id
  }
}`;

function getSwapQuery(filter,type = 'String'){
  return gql`query swaps($skip: Int, $first: Int, $firstSwap: ${type}, $orderBy: String) {
    swaps(skip: $skip, first: $first, where: { ${filter}_gt : $firstSwap }, orderBy: $orderBy) {
      id,
      amountUSD
    }
  }`;
}


const firstSwapQuery = gql`query swaps($orderBy: String) {
  swaps(first: 1, orderBy: $orderBy) {
    id,
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
 * Calculate the total number of addresses that have used Pangolin
 */
 async function calcAddresses() {
  let num_addresses = 0;
  let new_addrs = 0;
  let query_vars = {
    first: queryLimit,
    firstUser: `0x0000000000000000000000000000000000000000`,
    orderBy: `id`
  };
  do {
    let result = await client.request(userQuery, query_vars);
    query_vars.firstUser = result.users[result.users.length - 1].id;
    new_addrs = result['users'].length;
    num_addresses += new_addrs;
  } while (new_addrs == queryLimit)

  return num_addresses;
}

/**
 * Helper to discover number of swap transactions
 */
async function getSwapsNumber() {
  let totalSwaps = 0;
  let firstID = await client.request(firstSwapQuery, { orderBy: 'id' });
  let query_vars = {
    firstSwap: firstID.swaps[0].id,
    orderBy: `id`,
    skip: skipLimit,
    limit: 100
  };
  do {
    let result = await client.request(getSwapQuery('id'), query_vars);
    let swapNumber = 0;
    if (result.swaps.length > 0) {
      query_vars.lastId = query_vars.firstSwap;
      query_vars.firstSwap = result.swaps[result.swaps.length - 1].id;
      swapNumber = result['swaps'].length;
      totalSwaps += swapNumber + query_vars.skip;
      hasCount = true;
    } else {
      //if the skip passes from the end, it returns and use only limit
      if (query_vars.skip > 0) {
        query_vars.skip = 0;
        query_vars.limit = queryLimit;
        query_vars.firstSwap = query_vars.lastId;
        hasCount = true;
      } else {
        hasCount = false;
      }
    }
  } while (hasCount)
  return totalSwaps;
}


/**
 * Helper to get the median of swaps
 */
async function getMedSwap(mid) {
  let totalSwaps = 0;
  let median = 0;
  let firstValue = await client.request(firstSwapQuery, { orderBy: 'amountUSD' });
  let query_vars = {
    firstSwap: parseFloat(firstValue.swaps[0].amountUSD),
    orderBy: `amountUSD`,
    skip: skipLimit,
    limit: 100
  };
  let isMid = false;
  do {
    let result = await client.request(getSwapQuery('amountUSD','BigDecimal'), query_vars);
    let swapNumber = 0;
    let lastAmount = parseFloat(result.swaps[result.swaps.length - 1].amountUSD);
    query_vars.firstSwap = lastAmount > query_vars.firstSwap ? lastAmount:parseFloat(query_vars.firstSwap)+0.1e-17;
    swapNumber = result['swaps'].length;
    totalSwaps += swapNumber + query_vars.skip;
    let lack = mid-totalSwaps;
    //if there`s less or equal than 5100 results left to the mid prepare a single query
    if(lack <= query_vars.skip+query_vars.limit){
      isMid = true;
      if(lack > queryLimit){
        query_vars.skip = lack-queryLimit;
        lack -= query_vars.skip;
      }
      query_vars.limit = lack;
      let result = await client.request(getSwapQuery('amountUSD','BigDecimal'), query_vars);
      median = result.swaps[result.swaps.length-1].amountUSD;
    }
  }
  while (!isMid)

  return median;
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

/**
 * Calculate median on swap transactions USD
 */
async function calcMedian() {
  let swapCount = await getSwapsNumber();
  let avaxPrice = await getAvaxPrice();
  let medianIndex = Math.floor(swapCount / 2);
  let medianSwap = await getMedSwap(medianIndex);
  let median = parseFloat(medianSwap);
  let medianUSD = median * avaxPrice;

  return medianUSD;
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
