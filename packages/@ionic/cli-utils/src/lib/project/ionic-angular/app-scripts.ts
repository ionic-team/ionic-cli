import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

import { CommandMetadataOption } from '../../../definitions';
import { OptionGroup } from '../../../constants';

export async function importAppScripts(projectDir: string): Promise<any> {
  const appScriptsPath = resolve('@ionic/app-scripts', { paths: compileNodeModulesPaths(projectDir) });

  return require(appScriptsPath);
}

export const APP_SCRIPTS_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'prod',
    summary: 'Build the application for production',
    type: Boolean,
    groups: [OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'aot',
    summary: 'Perform ahead-of-time compilation for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'minifyjs',
    summary: 'Minify JS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'minifycss',
    summary: 'Minify CSS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'optimizejs',
    summary: 'Perform JS optimizations for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
  {
    name: 'env',
    summary: '',
    groups: [OptionGroup.Hidden, OptionGroup.AppScripts],
    hint: 'app-scripts',
  },
];
