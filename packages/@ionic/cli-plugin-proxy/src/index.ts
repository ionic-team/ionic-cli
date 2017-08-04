import * as path from 'path';
import * as superagentProxy from 'superagent-proxy';

import { IHookEngine } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'plugins:init', async ({ env }) => {
    const superagent = env.load('superagent');
    superagentProxy(superagent);
  });

  hooks.register(name, 'info', async () => {
    return [
      { type: 'cli-packages', name, version, path: path.dirname(path.dirname(__filename)) },
    ];
  });
}
