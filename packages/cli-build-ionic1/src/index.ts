import { EventEnvironment } from '@ionic/cli-utils';
import serve from './serve/index';

export default function(env: EventEnvironment)  {

  return async function (eventName: string, options: { [key: string]: any }): Promise<any> {
    if (eventName === 'serve') {
      return serve(env, options['metadata'], options['inputs'], options['options']);
    }
  };
}
