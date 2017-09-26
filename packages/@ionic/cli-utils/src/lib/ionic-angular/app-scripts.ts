import * as path from 'path';

import { IonicEnvironment, CommandOption } from '../../definitions';

export async function importAppScripts(env: IonicEnvironment): Promise<any> {
  const appScriptsPath = path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts'); // TODO

  return require(appScriptsPath);
}

export const APP_SCRIPTS_OPTIONS: CommandOption[] = [
  {
    name: 'prod',
    description: 'Build the application for production',
    type: Boolean,
    intent: 'app-scripts',
  },
  {
    name: 'aot',
    description: 'Perform ahead-of-time compilation for this build',
    type: Boolean,
    intent: 'app-scripts',
    advanced: true,
  },
  {
    name: 'minifyjs',
    description: 'Minify JS for this build',
    type: Boolean,
    intent: 'app-scripts',
    advanced: true,
  },
  {
    name: 'minifycss',
    description: 'Minify CSS for this build',
    type: Boolean,
    intent: 'app-scripts',
    advanced: true,
  },
  {
    name: 'optimizejs',
    description: 'Perform JS optimizations for this build',
    type: Boolean,
    intent: 'app-scripts',
    advanced: true,
  },
];
