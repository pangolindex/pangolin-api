import * as uvu from 'uvu';

export function describe(name: string, fn: (it: uvu.Test<{address: string}>) => void) {
  const suite = uvu.suite(name, {
    address: 'http://127.0.0.1:8787',
  });
  fn(suite);
  suite.run();
}
