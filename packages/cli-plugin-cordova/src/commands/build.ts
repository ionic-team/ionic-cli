import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  normalizeOptionAliases,
  validators,
} from '@ionic/cli-utils';

import { generateBuildOptions, filterArgumentsForCordova, CORDOVA_INTENT } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaPlatformCommand } from './base';

@CommandMetadata({
  name: 'build',
  type: 'project',
  description: 'Build (prepare + compile) an Ionic project for a given platform',
  exampleCommands: ['ios'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to build: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to build: ${chalk.green('ios')}, ${chalk.green('android')}:`
      }
    }
  ],
  options: [
    // Build Options
    {
      name: 'prod',
      description: 'Build the application for production',
      type: Boolean
    },
    // Cordova Options
    {
      name: 'debug',
      description: 'Create a cordova debug build',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'release',
      description: 'Create a cordova release build',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'device',
      description: 'Deploy cordova build to a device',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'emulator',
      description: 'Deploy cordova build to an emulator',
      type: Boolean,
      intent: CORDOVA_INTENT
    }
  ]
})
export class BuildCommand extends CordovaPlatformCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    options = normalizeOptionAliases(this.metadata, options);

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    await this.env.hooks.fire('command:build', {
      env: this.env,
      inputs,
      options: generateBuildOptions(this.metadata, options)
    });

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
  }
}
