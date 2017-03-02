import {
  checkEnvironment,
  // setupGulpInstance,
  // runGulpHook
 } from './utils/gulp';
 import { EventEnvironment } from '@ionic/cli-utils';
 import serve from './serve/index';

export default function(env: EventEnvironment)  {

  return async function (eventName: string, options: { [key: string]: any }): Promise<any> {

    if ((eventName.endsWith(':before') || eventName.endsWith(':after')) &&
        checkEnvironment(env.project.directory)) {

      // let gulp = setupGulpInstance(env.project.directory);
      try {
        // await runGulpHook(gulp, eventName);
      } catch (e) {
        env.log.error(e);
      }
    }

    if (eventName === 'serve') {
      return serve(env, options['metadata'], options['inputs'], options['options']);
    }
  };
}
