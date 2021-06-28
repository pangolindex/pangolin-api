import * as assert from 'uvu/assert';
import {STAKING_ADDRESSES} from '../src/constants';
import {describe, get} from './setup';

describe('/', (it) => {
  it('/', async () => {
    const {statusCode, data} = await get('/');

    assert.is(statusCode, 200);
    assert.is(data, 'Refer to https://github.com/pangolindex/pangolin-api for documentation.');
  });
});

describe('/png', (it) => {
  it('/png/tvl', async () => {
    const {statusCode, data} = await get('/png/tvl');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-volume', async () => {
    const {statusCode, data} = await get('/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-supply', async () => {
    const {statusCode, data} = await get('/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '538000000000000000000000000');
  });

  it('/png/total-supply-whole', async () => {
    const {statusCode, data} = await get('/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '538000000');
  });

  it('/png/circulating-supply', async () => {
    const {statusCode, data} = await get('/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/circulating-supply-whole', async () => {
    const {statusCode, data} = await get('/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury', async () => {
    const {statusCode, data} = await get('/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury-whole', async () => {
    const {statusCode, data} = await get('/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });
});

describe('/pangolin', (it) => {
  it('/pangolin/addresses', async () => {
    const {statusCode, data} = await get('/pangolin/addresses');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/pangolin/transaction-average', async () => {
    const {statusCode, data} = await get('/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  // TODO: it('/pangolin/transaction-median', async () => {
  //   const {statusCode, data} = await get('/pangolin/transaction-median');

  //   assert.is(statusCode, 200);
  //   assert.match(data, /^[.?\d]+/);
  // });

  void Promise.all(
    STAKING_ADDRESSES.map((stakingAddress) => {
      it(`/pangolin/apr/${stakingAddress}`, async () => {
        const {statusCode, data} = await get('/pangolin/apr/' + stakingAddress);

        assert.is(statusCode, 200);
        assert.ok(Number.parseInt(data, 10) > 0);
      });
    }),
  );
});
