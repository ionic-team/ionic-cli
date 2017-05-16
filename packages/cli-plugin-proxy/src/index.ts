import * as superagentProxy from 'superagent-proxy';

import { IHookEngine, load } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

const superagent = load('superagent');
superagentProxy(superagent);

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async ({ env }) => {
    return [
      { type: 'global-packages', name, version },
    ];
  });
}
