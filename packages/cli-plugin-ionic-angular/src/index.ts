import { EventEnvironment } from '@ionic/cli-utils';

import { build } from './build';
import { generate } from './generate';
import { serve } from './serve';

export default function(env: EventEnvironment)  {

  return async function (eventName: string, options: { [key: string]: any }): Promise<any> {
    switch (eventName) {
    case 'build':
      return build(options['metadata'], options['inputs'], options['options']);
    case 'generate':
      return generate(options['metadata'], options['inputs'], options['options']);
    case 'serve':
      return serve(options['metadata'], options['inputs'], options['options']);
    }
  };
}
