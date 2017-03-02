import build from './build';
import serve from './serve';
 import { EventEnvironment } from '@ionic/cli-utils';

export default function(env: EventEnvironment)  {

  return function (eventName: string, options: { [key: string]: any }): Promise<any> {

    switch (eventName) {
    case 'build':
      return build(options['metadata'], options['inputs'], options['options']);
    case 'serve':
      return serve(options['metadata'], options['inputs'], options['options']);
    }

    return Promise.resolve();
  };
}
