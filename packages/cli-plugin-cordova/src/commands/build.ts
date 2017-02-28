import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  validators,
  normalizeOptionAliases
} from '@ionic/cli-utils';
import {
  filterArgumentsForCordova,
  CORDOVA_INTENT
} from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import {
  arePluginsInstalled,
  getProjectPlatforms,
  installPlatform,
  installPlugins
} from '../lib/utils/setup';

/**
 * Metadata about the build command
 */
@CommandMetadata({
  name: 'build',
  description: 'Build (prepare + compile) an Ionic project for a given platform.',
  exampleCommands: ['ios'],
  inputs: [
    {
      name: 'platform',
      description: `the platform that you would like to build: ${chalk.bold('ios')}, ${chalk.bold('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to build (${chalk.bold('ios')}, ${chalk.bold('android')}):`
      }
    }
  ],
  options: [
    // App Scripts Options
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
export class BuildCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    options = normalizeOptionAliases(this.metadata, options);

    // If there is not input then set default to an array containing ios
    const runPlatform = inputs[0];

    if (runPlatform === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot build for iOS unless you are on Mac OSX.');
      return;
    }

    var tasks = new TaskChain();

    await Promise.all([
      getProjectPlatforms(this.env.project.directory).then((platforms): Promise<string | void> => {
        if (!platforms.includes(runPlatform)) {
          tasks.next(`Installing the platform: ${chalk.bold('cordova platform add ' + runPlatform)}`);
          return installPlatform(runPlatform);
        }
        return Promise.resolve();
      }),
      arePluginsInstalled(this.env.project.directory).then((areInstalled): Promise<string[] | void> => {
        if (!areInstalled) {
          tasks.next(`Installing the project plugins: ${chalk.bold('cordova plugin add --save <plugin>')}`);
          return installPlugins();
        }
        return Promise.resolve();
      })
    ]);

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    tasks.end();
    await this.env.emitEvent('build', {
      metadata: this.metadata,
      inputs,
      options
    });
    tasks.next(`Running build`);

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await this.env.shell.run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
