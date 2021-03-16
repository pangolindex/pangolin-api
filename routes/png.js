const { ethers, BigNumber } = require("ethers");
const gql = require('graphql-request').gql;
//const request = require('graphql-request').request;
const GraphQLClient = require('graphql-request').GraphQLClient;
const CoinGecko = require('coingecko-api');

var express = require('express');
var router = express.Router();

const provider = new ethers.providers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");

const PNG_ADDRESS = '0x60781C2586D68229fde47564546784ab3fACA982'
const pngAbi = [
  "function balanceOf(address) view returns (uint)"
];

const pngContract = new ethers.Contract(PNG_ADDRESS, pngAbi, provider);

const TREASURY_VESTER_ADDRESS = "0x6747AC215dAFfeE03a42F49FebB6ab448E12acEe";
const COMMUNITY_TREASURY_ADDRESS = "0x650f5865541f6D68BdDFE977dB933C293EA72358";

const ONE_TOKEN = BigNumber.from("1000000000000000000");

const TOTAL_SUPPLY = ONE_TOKEN.mul(538000000);

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

const client = new GraphQLClient('https://graph-node.avax.network/subgraphs/name/dasconnor/pangolindex', { headers: {} });

const coinGeckoClient = new CoinGecko();

async function getGlobalStats() {
  result = await client.request(factoryQueryString)
  return result;
}

async function getAvaxPrice() {
  const result = await coinGeckoClient.simple.price({
    ids: ['avalanche-2'],
    vs_currencies: ['usd']
  })

  return result['data']['avalanche-2']['usd']
}

async function computeTVL() {
  const stats = await getGlobalStats();
  const avaxPrice = await getAvaxPrice();

  const liquidity = stats['pangolinFactories'][0]['totalLiquidityETH'] * avaxPrice
  return liquidity
}

async function computeVolume() {
  const stats = await getGlobalStats();
  const avaxPrice = await getAvaxPrice();

  const volume = stats['pangolinFactories'][0]['totalVolumeETH'] * avaxPrice
  return volume
}

/* GET total supply. */
router.get('/', function(req, res, next) {
  res.send('Got a request');
});

/* GET  TVL */
router.get('/tvl', function(req, res, next) {
  computeTVL().then(function (tvl) {
    res.send(tvl.toFixed(2));
  });
});

router.get('/total-volume', function(req, res, next) {
  computeVolume().then(function (volume) {
    res.send(volume.toFixed(2));
  });
});

/* GET total supply. */
router.get('/total-supply', function(req, res, next) {
  res.send(TOTAL_SUPPLY.toString());
});

/* GET total supply. */
router.get('/total-supply-whole', function(req, res, next) {
  res.send(TOTAL_SUPPLY.div(ONE_TOKEN).toString());
});

async function calcCirculating() {
  var supply = TOTAL_SUPPLY;
  var balance = await pngContract.balanceOf(TREASURY_VESTER_ADDRESS);
  supply = supply.sub(balance);

  balance = await pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS);
  supply = supply.sub(balance);
  return supply;
}

/* GET circulating supply. */
// total_supply - treasury_vester - community_treasury
router.get('/circulating-supply', function(req, res, next) {
  calcCirculating().then(function (supply) {
    res.send(supply.toString());
  })
  .catch(next)
});

router.get('/circulating-supply-whole', function(req, res, next) {
  calcCirculating().then(function (supply) {
    res.send(supply.div(ONE_TOKEN).toString());
  })
  .catch(next)
});

/* GET community treasury supply. */
router.get('/community-treasury', function(req, res, next) {
  pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS).then(function (supply) {
    res.send(supply.toString());
  })
  .catch(next)
});

/* GET community treasury supply. */
router.get('/community-treasury-whole', function(req, res, next) {
  pngContract.balanceOf(COMMUNITY_TREASURY_ADDRESS).then(function (supply) {
    res.send(supply.div(ONE_TOKEN).toString());
  })
  .catch(next)
});

module.exports = router;
