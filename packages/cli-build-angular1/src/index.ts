import {
  checkEnvironment,
  setupGulpInstance,
  runGulpHook
 } from './utils/gulp';
 import { IonicEnvironment } from '@ionic/cli-utils';
 import serve from './serve/index';

export default function(ionicEnvironment: IonicEnvironment)  {

  return async function (eventName: string, options: { [key: string]: any }): Promise<any> {

    if ((eventName.endsWith(':before') || eventName.endsWith(':after')) &&
        checkEnvironment(ionicEnvironment.project.directory)) {

      let gulp = setupGulpInstance(ionicEnvironment.project.directory);
      await runGulpHook(gulp, eventName);
      return;
    }

    if (eventName === 'serve') {
      return serve(ionicEnvironment.project, options['metadata'], options['inputs'], options['options']);
    }

    return Promise.resolve();
  };
}
