import * as path from 'path';

import { InfoItem } from '@ionic/cli-utils';

const name = '@ionic/cli-plugin-proxy';

export async function getInfo() {
  const { readPackageJsonFileOfResolvedModule } = await import('@ionic/cli-utils/lib/utils/npm');
  const packageJson = await readPackageJsonFileOfResolvedModule(__filename);
  const version = packageJson.version || '';

  const envvars = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];
  const infos = envvars.map((v): InfoItem => ({ type: 'environment', key: v, value: process.env[v] || 'not set' }));

  infos.push({ type: 'cli-packages', key: name, value: version, path: path.dirname(path.dirname(__filename)) });

  return infos;
}
