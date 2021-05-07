import {Router, listen} from 'worktop';
import * as Pangolin from './routes/pangolin';
import * as PNG from './routes/png';
import * as CORS from 'worktop/cors';

const API = new Router();

API.prepare = CORS.preflight({
  origin: '*',
  headers: ['Cache-Control', 'Content-Type'],
  methods: ['GET'],
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
API.add('GET', '/pangolin/transaction-median', Pangolin.median);
API.add('GET', '/pangolin/apr/:address', Pangolin.apr);

listen(API.run);
