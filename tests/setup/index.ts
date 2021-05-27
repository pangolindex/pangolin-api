import * as uvu from 'uvu';
import {HttpieOptions, send} from 'httpie';

export function describe(name: string, fn: (it: uvu.Test) => void) {
  const suite = uvu.suite(name);
  fn(suite);
  suite.run();
}

export async function get(pathname: string, options?: Partial<HttpieOptions>) {
  const url = new URL('http://127.0.0.1:8787');
  url.pathname = pathname;
  return send('GET', url, options);
}
