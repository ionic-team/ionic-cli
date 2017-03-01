import {
  checkEnvironment,
  setupGulpInstance,
  runGulpHook
 } from './utils/gulp';
 import serve from './serve/index';

export default function(projectDirectory: string)  {

  return async function (eventName: string, options: { [key: string]: any }): Promise<any> {

    if ((eventName.endsWith(':before') || eventName.endsWith(':after')) &&
        checkEnvironment(projectDirectory)) {

      let gulp = setupGulpInstance(projectDirectory);
      await runGulpHook(gulp, eventName);
      return;
    }

    if (eventName === 'serve') {
      return serve(projectDirectory, options['metadata'], options['inputs'], options['options']);
    }

    return Promise.resolve();
  };
}
