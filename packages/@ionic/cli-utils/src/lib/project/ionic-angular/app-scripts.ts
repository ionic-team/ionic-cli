import * as path from 'path';

import { CommandMetadataOption, IonicEnvironment } from '../../../definitions';
import { OptionGroup } from '../../../constants';

export async function importAppScripts(env: IonicEnvironment): Promise<any> {
  const appScriptsPath = path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts'); // TODO

  return require(appScriptsPath);
}

export const APP_SCRIPTS_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'prod',
    description: 'Build the application for production',
    type: Boolean,
    groups: [OptionGroup.AppScripts],
  },
  {
    name: 'aot',
    description: 'Perform ahead-of-time compilation for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
  },
  {
    name: 'minifyjs',
    description: 'Minify JS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
  },
  {
    name: 'minifycss',
    description: 'Minify CSS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
  },
  {
    name: 'optimizejs',
    description: 'Perform JS optimizations for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
  },
  {
    name: 'env',
    description: '',
    groups: [OptionGroup.Hidden, OptionGroup.AppScripts],
  },
];
