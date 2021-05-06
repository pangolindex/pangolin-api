import {GRAPH_URL} from './constants';

export async function request(query: string, variables = {}) {
  const _ = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const {data} = await _.json();

  return data;
}
