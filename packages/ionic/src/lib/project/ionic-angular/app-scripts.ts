import { OptionGroup } from '@ionic/cli-framework';
import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/node';
import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandMetadataOption } from '../../../definitions';

const debug = Debug('ionic:lib:project:ionic-angular:app-scripts');

export async function importAppScripts(projectDir: string): Promise<any> {
  const pkg = '@ionic/app-scripts';

  debug('Importing %s', pkg);
  const p = resolve(pkg, { paths: compileNodeModulesPaths(projectDir) });
  const m = require(p);
  debug('fin');

  return m;
}

export const APP_SCRIPTS_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'prod',
    summary: 'Build the application for production',
    type: Boolean,
    groups: ['app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
  {
    name: 'aot',
    summary: 'Perform ahead-of-time compilation for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, 'app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
  {
    name: 'minifyjs',
    summary: 'Minify JS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, 'app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
  {
    name: 'minifycss',
    summary: 'Minify CSS for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, 'app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
  {
    name: 'optimizejs',
    summary: 'Perform JS optimizations for this build',
    type: Boolean,
    groups: [OptionGroup.Advanced, 'app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
  {
    name: 'env',
    summary: '',
    groups: [OptionGroup.Hidden, OptionGroup.Advanced, 'app-scripts'],
    hint: chalk.dim('[app-scripts]'),
  },
];
