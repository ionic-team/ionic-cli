import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  validators
} from '@ionic/cli-utils';
import {
  filterArgumentsForCordova,
  generateAppScriptsArguments
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
        message: `What platform would you like to build: ${chalk.bold('ios')}, ${chalk.bold('android')}`
      }
    }
  ],
  options: [
    {
      name: 'nohooks',
      description: 'Do not add default Ionic hooks for Cordova',
      type: Boolean
    }
  ]
})
export class BuildCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

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

    const appScriptsArgs = generateAppScriptsArguments(this.metadata, inputs, options);

    const currentTask = tasks.next(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
    currentTask.end();

    // We are using require because app-scripts reads process.argv during parse
    process.argv = appScriptsArgs;
    const appScripts = require('@ionic/app-scripts');
    const context = appScripts.generateContext();
    await appScripts.build(context);

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await this.env.shell.run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
