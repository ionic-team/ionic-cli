import * as chalk from 'chalk';

import { CommandMetadata } from '@ionic/cli-utils';

import { CORDOVA_RUN_COMMAND_OPTIONS, CordovaRunCommand } from './base';

@CommandMetadata({
  name: 'emulate',
  type: 'project',
  description: 'Emulate an Ionic project on a simulator or emulator',
  exampleCommands: ['', 'ios', 'ios -lc', 'android --livereload -cs'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to emulate: ${chalk.green('ios')}, ${chalk.green('android')}`,
    }
  ],
  options: CORDOVA_RUN_COMMAND_OPTIONS,
})
export class EmulateCommand extends CordovaRunCommand {}
