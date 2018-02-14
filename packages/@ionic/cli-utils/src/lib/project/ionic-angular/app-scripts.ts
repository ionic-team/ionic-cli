import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

import { CommandMetadataOption, IonicEnvironment } from '../../../definitions';
import { OptionGroup } from '../../../constants';

export async function importAppScripts(env: IonicEnvironment): Promise<any> {
  const appScriptsPath = resolve('@ionic/app-scripts', { paths: compileNodeModulesPaths(env.project.directory) });

  return require(appScriptsPath);
}

export const APP_SCRIPTS_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'prod',
    description: 'Build the application for production',
    type: Boolean,
    groups: [OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'aot',
    description: 'Perform ahead-of-time compilation for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'minifyjs',
    description: 'Minify JS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'minifycss',
    description: 'Minify CSS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'optimizejs',
    description: 'Perform JS optimizations for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'env',
    description: '',
    groups: [OptionGroup.Hidden, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
];
