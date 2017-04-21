import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  validators,
} from '@ionic/cli-utils';

import { generateBuildOptions, filterArgumentsForCordova, CORDOVA_INTENT } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc, writeConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaPlatformCommand } from './base';

@CommandMetadata({
  name: 'run',
  type: 'project',
  description: 'Run an Ionic project on a connected device',
  exampleCommands: ['ios --livereload -c -s'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to run: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to run: ${chalk.green('ios')}, ${chalk.green('android')}`
      }
    }
  ],
  options: [
    // App Scripts Options
    {
      name: 'livereload',
      description: 'Live reload app dev files from the device',
      type: Boolean,
      aliases: ['l']
    },
    {
      name: 'address',
      description: 'Use specific address (livereload req.)',
      default: '0.0.0.0'
    },
    {
      name: 'consolelogs',
      description: 'Print app console logs to Ionic CLI',
      type: Boolean,
      aliases: ['c']
    },
    {
      name: 'serverlogs',
      description: 'Print dev server logs to Ionic CLI',
      type: Boolean,
      aliases: ['s']
    },
    {
      name: 'port',
      description: 'Dev server HTTP port',
      default: '8100',
      aliases: ['p']
    },
    {
      name: 'livereload-port',
      description: 'Live Reload port',
      default: '35729',
      aliases: ['r']
    },
    {
      name: 'prod',
      description: 'Create a prod build with app-scripts',
      type: Boolean
    },
    // Cordova Options
    {
      name: 'list',
      description: 'List all available Cordova run targets',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'debug',
      description: 'Create a Cordova debug build',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'release',
      description: 'Create a Cordova release build',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'device',
      description: 'Deploy Cordova build to a device',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'emulator',
      description: 'Deploy Cordova build to an emulator',
      type: Boolean,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'target',
      description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
      type: String,
      intent: CORDOVA_INTENT,
    },
    {
      name: 'buildConfig',
      description: 'Use the specified Cordova build configuration',
      intent: CORDOVA_INTENT,
    },
  ]
})
export class RunCommand extends CordovaPlatformCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const isLiveReload = options['livereload'];

    // If it is not livereload then just run build.
    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);
      await this.env.hooks.fire('command:build', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      });
    } else {
      const serverSettings = (await this.env.hooks.fire('command:serve', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      }))[0];

      await writeConfigXmlContentSrc(this.env.project.directory, `http://${serverSettings.publicIp}:${serverSettings.httpPort}`);
    }

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
  }
}
