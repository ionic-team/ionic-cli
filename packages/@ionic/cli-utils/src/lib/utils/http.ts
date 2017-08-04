import * as superagentType from 'superagent';

export function getGlobalProxy(): [string, string] | [undefined, undefined] {
  const envvars = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];

  for (let envvar of envvars) {
    if (process.env[envvar]) {
      return [process.env[envvar], envvar];
    }
  }

  return [undefined, undefined];
}

export function createRequest(method: string, url: string): superagentType.SuperAgentRequest {
  const [ proxy, ] = getGlobalProxy();
  const superagent = require('superagent') as superagentType.SuperAgentStatic;
  let req = superagent(method, url);

  if (proxy && req.proxy) {
    req = req.proxy(proxy);
  }

  return req;
}
