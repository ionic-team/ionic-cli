import * as chalk from 'chalk';

import { CommandMetadata } from '@ionic/cli-utils/lib/command';

import { CORDOVA_RUN_COMMAND_OPTIONS, CordovaRunCommand } from './base';

@CommandMetadata({
  name: 'emulate',
  type: 'project',
  description: 'Emulate an Ionic project on a simulator or emulator',
  longDescription: `
Like running ${chalk.green('cordova emulate')} directly, but also watches for changes in web assets and provides live-reload functionality with the ${chalk.green('--livereload')} option.

For Android and iOS, you can setup Remote Debugging on your emulator with browser development tools: ${chalk.bold('https://docs.ionic.io/tools/developer/#remote-debugging')}
  `,
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
