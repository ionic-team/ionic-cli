import * as chalk from 'chalk';

import { CommandMetadata } from '@ionic/cli-utils';

import { CORDOVA_RUN_COMMAND_OPTIONS, CordovaRunCommand } from './base';

@CommandMetadata({
  name: 'run',
  type: 'project',
  description: 'Run an Ionic project on a connected device',
  exampleCommands: ['', 'ios', 'ios -lc', 'android --livereload -cs'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to run: ${chalk.green('ios')}, ${chalk.green('android')}`,
    }
  ],
  options: CORDOVA_RUN_COMMAND_OPTIONS,
})
export class RunCommand extends CordovaRunCommand {}
