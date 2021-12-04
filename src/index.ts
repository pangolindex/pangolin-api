import {Router} from 'worktop';
import * as CORS from 'worktop/cors';
import * as Cache from 'worktop/cache';
import {send} from 'worktop/response';
import * as Pangolin from './routes/pangolin';
import * as PNG from './routes/png';

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

API.add('GET', '/png/tvl', PNG.tvl);
API.add('GET', '/png/total-volume', PNG.volume);
API.add('GET', '/png/total-supply', PNG.supply);
API.add('GET', '/png/total-supply-whole', PNG.supplyWhole);
API.add('GET', '/png/circulating-supply', PNG.circulating);
API.add('GET', '/png/circulating-supply-whole', PNG.circulatingWhole);
API.add('GET', '/png/community-treasury', PNG.treasury);
API.add('GET', '/png/community-treasury-whole', PNG.treasuryWhole);

API.add('GET', '/pangolin/addresses', Pangolin.addresses);
API.add('GET', '/pangolin/transaction-average', Pangolin.average);
// API.add('GET', '/pangolin/transaction-median', Pangolin.median);
API.add('GET', '/pangolin/apr/:address', Pangolin.apr);
API.add('GET', '/pangolin/apr2/:pid', Pangolin.apr2);
API.add('GET', '/pangolin/stakingTokenAddresses', Pangolin.stakingTokenAddresses);

Cache.listen(async (event) => {
  return API.run(event.request, event);
});
