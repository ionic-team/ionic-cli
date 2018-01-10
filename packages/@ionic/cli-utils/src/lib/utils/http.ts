export function getGlobalProxy(): [string, string] | [undefined, undefined] {
  const envvars = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];

  for (const envvar of envvars) {
    if (process.env[envvar]) {
      return [process.env[envvar], envvar];
    }
  }

  return [undefined, undefined];
}
