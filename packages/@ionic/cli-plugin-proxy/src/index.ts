import * as path from 'path';
import * as superagentProxy from 'superagent-proxy';

import { IHookEngine, InfoHookItem } from '@ionic/cli-utils';

const name = '@ionic/cli-plugin-proxy';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'plugins:init', async ({ env }) => {
    const superagent = env.load('superagent');
    superagentProxy(superagent);
  });

  hooks.register(name, 'info', async () => {
    const { readPackageJsonFileOfResolvedModule } = await import('@ionic/cli-utils/lib/utils/npm');
    const packageJson = await readPackageJsonFileOfResolvedModule(__filename);
    const version = packageJson.version || '';

    const envvars = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];
    const infos = envvars.map((v): InfoHookItem => ({ type: 'environment', key: v, value: process.env[v] || 'not set' }));

    infos.push({ type: 'cli-packages', key: name, value: version, path: path.dirname(path.dirname(__filename)) });

    return infos;
  });
}
