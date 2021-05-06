// eslint-disable-next-line node/file-extension-in-import
import * as assert from 'uvu/assert';
import {describe} from './setup/index.mjs';
import {get} from 'httpie';

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
});
