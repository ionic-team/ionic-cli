import { ICLIEventEmitter } from '@ionic/cli-utils';

import { serve } from './serve/index';

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('serve', async (args) => {
    return serve(args);
  });
}
