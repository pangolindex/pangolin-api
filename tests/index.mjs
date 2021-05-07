// eslint-disable-next-line node/file-extension-in-import
import * as assert from 'uvu/assert';
import {describe} from './setup/index.mjs';
import {get} from 'httpie';

const STAKING_ADDRESSES = [
  '0x417c02150b9a31bcacb201d1d60967653384e1c6', // AVAX-ETH
  '0x94c021845efe237163831dac39448cfd371279d6', // AVAX-USDT
  '0xe968e9753fd2c323c2fe94caff954a48afc18546', // AVAX-WBTC
  '0x574d3245e36cf8c9dc86430eadb0fdb2f385f829', // AVAX-PNG
  '0xbda623cdd04d822616a263bf4edbbce0b7dc4ae7', // AVAX-LINK
  '0x701e03fad691799a8905043c0d18d2213bbcf2c7', // AVAX-DAI
  '0x1f6acc5f5fe6af91c1bb3bebd27f4807a243d935', // AVAX-UNI
  '0xda354352b03f87f84315eef20cdd83c49f7e812e', // AVAX-SUSHI
  '0x4df32f1f8469648e89e62789f4246f73fe768b8e', // AVAX-AAVE
  '0x2c31822f35506c6444f458ed7470c79f9924ee86', // AVAX-YFI
  '0x640d754113a3cbdd80bccc1b5c0387148eebf2fe', // AVAX-SNOB
  '0x7ac007afb5d61f48d1e3c8cc130d4cf6b765000e', // PNG-ETH
  '0xe2510a1fcccde8d2d1c40b41e8f71fb1f47e5bba', // PNG-USDT
  '0x681047473b6145ba5db90b074e32861549e85cc7', // PNG-WBTC
  '0x6356b24b36074abe2903f44fe4019bc5864fde36', // PNG-LINK
  '0xe3103e565cf96a5709ae8e603b1efb7fed04613b', // PNG-DAI
  '0x4f74bbf6859a994e7c309ea0f11e3cc112955110', // PNG-UNI
  '0x633f4b4db7dd4fa066bd9949ab627a551e0ecd32', // PNG-SUSHI
  '0xfd9acec0f413ca05d5ad5b962f3b4de40018ad87', // PNG-AAVE
  '0xc7d0e29b616b29ac6ff4fd5f37c8da826d16db0d', // PNG-YFI
  '0x08b9a023e34bad6db868b699fa642bf5f12ebe76', // PNG-SNOB
];

describe('/png/', (it) => {
  it('/png/tvl', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/tvl');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-volume', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-supply', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '538000000000000000000000000');
  });

  it('/png/total-supply-whole', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '538000000');
  });

  it('/png/circulating-supply', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/circulating-supply-whole', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury-whole', async (context) => {
    const {statusCode, data} = await get(context.address + '/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });
});

describe('/pangolin/', (it) => {
  it('/pangolin/addresses', async (context) => {
    const {statusCode, data} = await get(context.address + '/pangolin/addresses');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/pangolin/transaction-average', async (context) => {
    const {statusCode, data} = await get(context.address + '/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/pangolin/transaction-median', async (context) => {
    const {statusCode, data} = await get(context.address + '/pangolin/transaction-median');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  Promise.all(
    STAKING_ADDRESSES.map((address) =>
      it(`/pangolin/apr/${address}`, async (context) => {
        const {statusCode, data} = await get(context.address + '/pangolin/apr/' + address);

        assert.is(statusCode, 200);
        assert.ok(Number.parseInt(data, 10) > 0);
      }),
    ),
  );
});
