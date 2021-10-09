import * as assert from 'uvu/assert';
import {STAKING_ADDRESSES} from '../src/constants';
import {describe, get} from './setup';

describe('/', (it) => {
  it('/', async () => {
    const {statusCode, data, headers} = await get('/');

    assert.is(statusCode, 200);
    assert.is(data, 'Refer to https://github.com/pangolindex/pangolin-api for documentation.');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });
});

describe('/png', (it) => {
  it('/png/tvl', async () => {
    const {statusCode, data, headers} = await get('/png/tvl');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/png/total-volume', async () => {
    const {statusCode, data, headers} = await get('/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/png/total-supply', async () => {
    const {statusCode, data, headers} = await get('/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '538000000000000000000000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/png/total-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '538000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/png/circulating-supply', async () => {
    const {statusCode, data, headers} = await get('/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/png/circulating-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/png/community-treasury', async () => {
    const {statusCode, data, headers} = await get('/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/png/community-treasury-whole', async () => {
    const {statusCode, data, headers} = await get('/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });
});

describe('/pangolin', (it) => {
  it('/pangolin/addresses', async () => {
    const {statusCode, data, headers} = await get('/pangolin/addresses');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  it('/pangolin/transaction-average', async () => {
    const {statusCode, data, headers} = await get('/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=30');
  });

  // TODO: it('/pangolin/transaction-median', async () => {
  //   const {statusCode, data, headers} = await get('/pangolin/transaction-median');

  //   assert.is(statusCode, 200);
  //   assert.match(data, /^[.?\d]+/);
  //   assert.is(headers['cache-control'], "public,s-maxage=30")
  // });

  void Promise.all(
    STAKING_ADDRESSES.map((stakingAddress) => {
      it(`/pangolin/apr/${stakingAddress}`, async () => {
        const {statusCode, data, headers} = await get(`/pangolin/apr/${stakingAddress}`);

        assert.is(statusCode, 200);
        assert.ok(data.swapFeeApr !== undefined);
        assert.ok(data.stakingApr !== undefined);
        assert.ok(data.combinedApr !== undefined);
        assert.is(headers['content-type'], 'application/json;charset=utf-8');
      });
    }),
  );
});
