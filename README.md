# Pangolin API

API for querying key values for Pangolin and the PNG token

## Development

[Wrangler](https://developers.cloudflare.com/workers/cli-wrangler) is used for a local development server. This is effectively a proxy-service that (nearly) replicates the Cloudflare Worker runtime.

Anyone can develop this repository locally. Fill in `account_id` in the `wrangler.toml` file. This value may (and should) be your own personal `account_id`.

## Location

The API is available at `https://api.pangolin.exchange`

## Methods

All methods accept a GET request.

### Pangolin TVL

Get the total value locked in Pangolin in USD.

Endpoint: `/png/tvl`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/tvl'`

### Pangolin Volume

Get the total lifetime volume of swaps on Pangolin in USD.

Endpoint: `/png/total-volume`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/total-volume'`

### PNG Total Supply

Get the total lifetime supply of PNG. PNG is a hard-capped asset and this value will never increase.

#### 18 Decimal Denomination

The PNG token has 18 decimals. Query the total supply denominated in units of "wei." With this method, a result of 1 PNG would return the value `1000000000000000000`.

Endpoint: `/png/total-supply`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/total-supply'`

#### Whole Token Denomination

The PNG token has 18 decimals. Query the total supply denominated in units of whole PNG. With this method, a result of 1 PNG would return the value `1`.

Endpoint: `/png/total-supply-whole`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/total-supply-whole'`

### PNG Circulating Supply

Get the current circulating supply of PNG. This value is calculated to be the total supply of PNG minus the locked, unvested PNG and also excludes the locked Pangolin community treasury.

#### 18 Decimal Denomination

The PNG token has 18 decimals. Query the circulating supply denominated in units of "wei." With this method, a result of 1 PNG would return the value `1000000000000000000`.

Endpoint: `/png/circulating-supply`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/circulating-supply'`

#### Whole Token Denomination

The PNG token has 18 decimals. Query the circulating supply denominated in units of whole PNG. With this method, a result of 1 PNG would return the value `1`.

Endpoint: `/png/circulating-supply-whole`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/circulating-supply-whole'`

### Pangolin Community Treasury Supply

Get the current PNG supply of the Pangolin Community Treasury.

#### 18 Decimal Denomination

The PNG token has 18 decimals. Query the balance denominated in units of "wei." With this method, a result of 1 PNG would return the value `1000000000000000000`.

Endpoint: `/png/community-treasury`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/community-treasury'`

#### Whole Token Denomination

The PNG token has 18 decimals. Query the circulating supply denominated in units of whole PNG. With this method, a result of 1 PNG would return the value `1`.

Endpoint: `/png/community-treasury-whole`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/png/community-treasury-whole'`

### Pangolin Number of Address

Get the total lifetime number of unique address to transact on Pangolin.

Endpoint: `/pangolin/addresses`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/pangolin/addresses'`

### Pangolin Average Swap Size

Get the average size of each swap on Pangolin in USD.

Endpoint: `/pangolin/transaction-average`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/pangolin/transaction-average'`

### Pangolin Median Swap Size

Get the median size of each swap on Pangolin in USD.

Endpoint: `/pangolin/transaction-median`

Example call: `curl --location --request GET 'https://api.pangolin.exchange/pangolin/transaction-median'`
