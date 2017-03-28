import { ICLIEventEmitter } from '@ionic/cli-utils';

import { build } from './build';
import { generate } from './generate';
import { serve } from './serve';

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('generate', async (args) => {
    return generate(args);
  });

  emitter.on('serve', async (args) => {
    return serve(args);
  });

  emitter.on('build', async (args) => {
    return build(args);
  });
}
