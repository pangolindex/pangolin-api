const { ethers, BigNumber } = require("ethers");
const gql = require('graphql-request').gql;
const GraphQLClient = require('graphql-request').GraphQLClient;
const CoinGecko = require('coingecko-api');

const express = require('express');
const router = express.Router();

// Pangolin contract addresses
const TREASURY_VESTER_ADDRESS = "0x6747AC215dAFfeE03a42F49FebB6ab448E12acEe";
const COMMUNITY_TREASURY_ADDRESS = "0x650f5865541f6D68BdDFE977dB933C293EA72358";
const PNG_ADDRESS = '0x60781C2586D68229fde47564546784ab3fACA982'

// Setup PNG contract interactions
const provider = new ethers.providers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
const pngAbi = [
  "function balanceOf(address) view returns (uint)"
];
const pngContract = new ethers.Contract(PNG_ADDRESS, pngAbi, provider);

// Supply constants
const ONE_TOKEN = BigNumber.from("1000000000000000000");
const TOTAL_SUPPLY = ONE_TOKEN.mul(538000000);

// Setup GraphQL Queries
const client = new GraphQLClient('https://graph-node.avax.network/subgraphs/name/dasconnor/pangolindex', { headers: {} });
const factoryQueryString = gql`query pangolinFactories {
  pangolinFactories(
   where: { id: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88" }) {
    id
    totalVolumeETH
    totalLiquidityETH
    txCount
    pairCount
  }
}`;

// Connect to CoinGeckoAPI
const coinGeckoClient = new CoinGecko();

/**
 * Get global stats from the Pangolin Analytics graph-node
 *
 * @returns global stats
 */
async function getGlobalStats() {
  result = await client.request(factoryQueryString)
  return result;
}

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
 * Computes the total value locked
 * @returns TVL in USD
 */
async function computeTVL() {
  const stats = await getGlobalStats();
  const avaxPrice = await getAvaxPrice();

  const liquidity = stats['pangolinFactories'][0]['totalLiquidityETH'] * avaxPrice
  return liquidity
}

/**
 * Computes the lifetime volume on Pangolin in USD
 * @returns volume in USD
 */
async function computeVolume() {
  const stats = await getGlobalStats();
  const avaxPrice = await getAvaxPrice();

  const volume = stats['pangolinFactories'][0]['totalVolumeETH'] * avaxPrice
  return volume
}


/**
 *  GET the TVL of Pangolin
 */
router.get('/tvl', function(req, res, next) {
  computeTVL().then(function (tvl) {
    res.send(tvl.toFixed(2));
  })
  .catch(next);
});

/**
 *  GET the lifetime volume of Pangolin
 */
router.get('/total-volume', function(req, res, next) {
  computeVolume().then(function (volume) {
    res.send(volume.toFixed(2));
  })
  .catch(next);
});

/**
 *  GET the total supply of PNG in 'wei' units
 */
router.get('/total-supply', function(req, res, next) {
  res.send(TOTAL_SUPPLY.toString());
});

/**
 *  GET the total supply of PNG in whole PNG units
 */
router.get('/total-supply-whole', function(req, res, next) {
  res.send(TOTAL_SUPPLY.div(ONE_TOKEN).toString());
});

/**
 * Calculates the circulating supply of PNG. Total supply minus unvested tokens
 * and the community treasury.
 *
 * @returns circulating supply of PNG in wei units
 */
async function calcCirculating() {
  let supply = TOTAL_SUPPLY;
  let balance = await pngContract.balanceOf(TREASURY_VESTER_ADDRESS);
  supply = supply.sub(balance);

  balance = await pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS);
  supply = supply.sub(balance);
  return supply;
}

/**
 *  GET the circulating supply of PNG in 'wei' units
 */
router.get('/circulating-supply', function(req, res, next) {
  calcCirculating().then(function (supply) {
    res.send(supply.toString());
  })
  .catch(next)
});

/**
 *  GET the circulating supply of PNG in whole PNG units
 */
router.get('/circulating-supply-whole', function(req, res, next) {
  calcCirculating().then(function (supply) {
    res.send(supply.div(ONE_TOKEN).toString());
  })
  .catch(next)
});

/**
 *  GET the PNG balance of the Pangolin Community Treasury in wei units
 */
router.get('/community-treasury', function(req, res, next) {
  pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS).then(function (supply) {
    res.send(supply.toString());
  })
  .catch(next)
});

/**
 *  GET the PNG balance of the Pangolin Community Treasury in whole PNG units
 */
router.get('/community-treasury-whole', function(req, res, next) {
  pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS).then(function (supply) {
    res.send(supply.div(ONE_TOKEN).toString());
  })
  .catch(next)
});

module.exports = router;
