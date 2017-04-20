import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  normalizeOptionAliases,
  validators,
} from '@ionic/cli-utils';

import { resetConfigXmlContentSrc, writeConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { generateBuildOptions, filterArgumentsForCordova, CORDOVA_INTENT } from '../lib/utils/cordova';
import { CordovaPlatformCommand } from './base';

@CommandMetadata({
  name: 'emulate',
  type: 'project',
  description: 'Emulate an Ionic project on a simulator or emulator',
  exampleCommands: ['ios --livereload -c -s'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to emulate: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to emulate (${chalk.green('ios')}, ${chalk.green('android')}):`
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
      intent: CORDOVA_INTENT
    },
    {
      name: 'debug',
      description: 'Create a Cordova debug build',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'release',
      description: 'Create a Cordova release build',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'device',
      description: 'Deploy Cordova build to a device',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
    {
      name: 'target',
      description: `Deploy Cordova build to a device (use ${chalk.green('--list')} to see all)`,
      type: String,
      intent: CORDOVA_INTENT
    }
  ]
})
export class EmulateCommand extends CordovaPlatformCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    options = normalizeOptionAliases(this.metadata, options);

    const isLiveReload = options['livereload'];
    const tasks = new TaskChain();

    // If it is not livereload then just run build.
    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);

      tasks.next('Starting build');

      await this.env.hooks.fire('command:build', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options)
      });
    } else {
      tasks.next('Starting server');

      const [ serverSettings ] = await this.env.hooks.fire('command:serve', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      });

      await writeConfigXmlContentSrc(this.env.project.directory, `http://${serverSettings.publicIp}:${serverSettings.httpPort}`);
    }

    tasks.end();

    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
  }
}
