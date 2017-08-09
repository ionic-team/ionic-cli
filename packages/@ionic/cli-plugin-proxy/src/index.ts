import * as path from 'path';
import * as superagentProxy from 'superagent-proxy';

import { IHookEngine } from '@ionic/cli-utils';

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

    return [
      { type: 'cli-packages', name, version, path: path.dirname(path.dirname(__filename)) },
    ];
  });
}
