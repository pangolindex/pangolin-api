import * as assert from 'uvu/assert';
import {describe, get} from './setup/env';

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
    assert.is(headers['cache-control'], 'public,s-maxage=300');
  });

  it('/png/total-volume', async () => {
    const {statusCode, data, headers} = await get('/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=300');
  });

  it('/png/total-supply', async () => {
    const {statusCode, data, headers} = await get('/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '230000000000000000000000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/png/total-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '230000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/png/circulating-supply', async () => {
    const {statusCode, data, headers} = await get('/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/png/circulating-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/png/community-treasury', async () => {
    const {statusCode, data, headers} = await get('/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=3600');
  });

  it('/png/community-treasury-whole', async () => {
    const {statusCode, data, headers} = await get('/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=3600');
  });
});

describe('/v2/:chain/png', (it) => {
  it('/v2/43114/png/tvl', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/tvl');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=300');
  });

  it('/v2/43114/png/total-volume', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/total-volume');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=300');
  });

  it('/v2/43114/png/total-supply', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/total-supply');

    assert.is(statusCode, 200);
    assert.is(data, '230000000000000000000000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/v2/43114/png/total-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/total-supply-whole');

    assert.is(statusCode, 200);
    assert.is(data, '230000000');
    assert.is(headers['cache-control'], 'public,s-maxage=31536000,immutable');
  });

  it('/v2/43114/png/circulating-supply', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/circulating-supply');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/v2/43114/png/circulating-supply-whole', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/circulating-supply-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/v2/43114/png/community-treasury', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/community-treasury');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=3600');
  });

  it('/v2/43114/png/community-treasury-whole', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/png/community-treasury-whole');

    assert.is(statusCode, 200);
    assert.match(data, /^\d+/);
    assert.is(headers['cache-control'], 'public,s-maxage=3600');
  });
});

describe('/pangolin', (it) => {
  it('/pangolin/addresses', async () => {
    const {statusCode, data, headers} = await get('/pangolin/addresses', {
      timeout: 60_000,
    });

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/pangolin/transaction-average', async () => {
    const {statusCode, data, headers} = await get('/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it(`/pangolin/apr/:address`, async () => {
    const {statusCode, data, headers} = await get(
      '/pangolin/apr/0x1f806f7c8ded893fd3cae279191ad7aa3798e928',
    );

    assert.is(statusCode, 200);
    assert.ok(data.swapFeeApr !== undefined);
    assert.ok(data.stakingApr !== undefined);
    assert.ok(data.combinedApr !== undefined);
    assert.is(headers['content-type'], 'application/json;charset=utf-8');
  });

  it(`/pangolin/apr2/:pid`, async () => {
    const {statusCode, data, headers} = await get(`/pangolin/apr2/0`);

    assert.is(statusCode, 200);
    assert.ok(data.swapFeeApr !== undefined);
    assert.ok(data.stakingApr !== undefined);
    assert.ok(data.combinedApr !== undefined);
    assert.is(headers['content-type'], 'application/json;charset=utf-8');
  });
});

describe('/v2/:chain/pangolin', (it) => {
  it('/v2/43114/pangolin/addresses', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/pangolin/addresses', {
      timeout: 60_000,
    });

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it('/v2/43114/pangolin/transaction-average', async () => {
    const {statusCode, data, headers} = await get('/v2/43114/pangolin/transaction-average');

    assert.is(statusCode, 200);
    assert.match(data, /^[.?\d]+/);
    assert.is(headers['cache-control'], 'public,s-maxage=86400');
  });

  it(`/v2/43114/pangolin/apr/:pid`, async () => {
    const {statusCode, data, headers} = await get(`/v2/43114/pangolin/apr/0`);

    assert.is(statusCode, 200);
    assert.ok(data.swapFeeApr !== undefined);
    assert.ok(data.stakingApr !== undefined);
    assert.ok(data.combinedApr !== undefined);
    assert.is(headers['content-type'], 'application/json;charset=utf-8');
  });
});
