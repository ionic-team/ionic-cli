import * as superagentProxy from 'superagent-proxy';

import { IHookEngine } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';
export const preferGlobal = true;

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'plugins:init', async ({ env }) => {
    const superagent = env.load('superagent');
    superagentProxy(superagent);
  });

  hooks.register(name, 'command:info', async ({ env }) => {
    return [
      { type: 'global-packages', name, version },
    ];
  });
}
