import chalk from 'chalk';

import { CommandMetadata } from '@ionic/cli-utils';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CORDOVA_RUN_COMMAND_OPTIONS, CordovaRunCommand } from './base';

export class RunCommand extends CordovaRunCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'run',
      type: 'project',
      description: 'Run an Ionic project on a connected device',
      longDescription: `
Like running ${chalk.green('cordova run')} directly, but also watches for changes in web assets and provides live-reload functionality with the ${chalk.green('--livereload')} option.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools: ${chalk.bold('https://ionicframework.com/docs/developer-resources/developer-tips/')}

Just like with ${chalk.green('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${chalk.green('--')} separator.
      `,
      exampleCommands: CORDOVA_BUILD_EXAMPLE_COMMANDS,
      inputs: [
        {
          name: 'platform',
          description: `The platform to run (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options: CORDOVA_RUN_COMMAND_OPTIONS,
    };
  }
}
