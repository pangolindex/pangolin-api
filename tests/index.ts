import * as assert from 'uvu/assert';
import {get} from 'httpie';
import {STAKING_ADDRESSES} from '../src/utils/constants';
import {describe} from './setup';

describe('/', (it) => {
  it('/', async ({address}) => {
    const {statusCode, data} = await get(address);

    assert.is(statusCode, 200);
    assert.is(data, 'Refer to https://github.com/pangolindex/pangolin-api for documentation.');
  });
});

describe('/png', (it) => {
  it('/png/tvl', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/tvl');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-volume', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/png/total-supply', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '538000000000000000000000000');
  });

  it('/png/total-supply-whole', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '538000000');
  });

  it('/png/circulating-supply', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/circulating-supply-whole', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });

  it('/png/community-treasury-whole', async ({address}) => {
    const {statusCode, data} = await get(address + '/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
  });
});

describe('/pangolin', (it) => {
  it('/pangolin/addresses', async ({address}) => {
    const {statusCode, data} = await get(address + '/pangolin/addresses');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/pangolin/transaction-average', async ({address}) => {
    const {statusCode, data} = await get(address + '/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  it('/pangolin/transaction-median', async ({address}) => {
    const {statusCode, data} = await get(address + '/pangolin/transaction-median');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
  });

  void Promise.all(
    STAKING_ADDRESSES.map((stakingAddress) => {
      it(`/pangolin/apr/${stakingAddress}`, async ({address}) => {
        const {statusCode, data} = await get(address + '/pangolin/apr/' + stakingAddress);

        assert.is(statusCode, 200);
        assert.ok(Number.parseInt(data, 10) > 0);
      });
    }),
  );
});
