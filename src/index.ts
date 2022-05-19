import {Router} from 'worktop';
import * as Cache from 'worktop/cache';
import * as CORS from 'worktop/cors';
import {send} from 'worktop/response';
import * as Pangolin from './handlers/pangolin';
import * as Png from './handlers/png';

const API = new Router();

API.prepare = CORS.preflight({
  origin: true,
  headers: ['Cache-Control', 'Content-Type'],
  methods: ['GET'],
});

API.add('GET', '/', () => {
  const text = 'Refer to https://github.com/pangolindex/pangolin-api for documentation.';

  return send(200, text, {
    'Cache-Control': 'public,s-maxage=31536000,immutable',
  });
});

// Legacy API
API.add('GET', '/png/tvl', Png.tvl);
API.add('GET', '/png/total-volume', Png.volume);
API.add('GET', '/png/total-supply', Png.supply);
API.add('GET', '/png/total-supply-whole', Png.supplyWhole);
API.add('GET', '/png/circulating-supply', Png.circulating);
API.add('GET', '/png/circulating-supply-whole', Png.circulatingWhole);
API.add('GET', '/png/community-treasury', Png.treasury);
API.add('GET', '/png/community-treasury-whole', Png.treasuryWhole);
API.add('GET', '/pangolin/addresses', Pangolin.addresses);
API.add('GET', '/pangolin/transaction-average', Pangolin.average);
API.add('GET', '/pangolin/apr/:address', Pangolin.aprLegacy);
API.add('GET', '/pangolin/apr2/:pid', Pangolin.aprChef);
API.add('GET', '/pangolin/stakingTokenAddresses', Pangolin.stakingTokenAddresses);

// V2 API
API.add('GET', '/v2/:chain/png/tvl', Png.tvl);
API.add('GET', '/v2/:chain/png/total-volume', Png.volume);
API.add('GET', '/v2/:chain/png/total-supply', Png.supply);
API.add('GET', '/v2/:chain/png/total-supply-whole', Png.supplyWhole);
API.add('GET', '/v2/:chain/png/circulating-supply', Png.circulating);
API.add('GET', '/v2/:chain/png/circulating-supply-whole', Png.circulatingWhole);
API.add('GET', '/v2/:chain/png/community-treasury', Png.treasury);
API.add('GET', '/v2/:chain/png/community-treasury-whole', Png.treasuryWhole);
API.add('GET', '/v2/:chain/pangolin/addresses', Pangolin.addresses);
API.add('GET', '/v2/:chain/pangolin/transaction-average', Pangolin.average);
API.add('GET', '/v2/:chain/pangolin/apr/:pid', Pangolin.aprChef);
API.add('GET', '/v2/:chain/pangolin/stakingTokenAddresses', Pangolin.stakingTokenAddresses);

Cache.listen(async (event) => {
  return API.run(event.request, event);
});
