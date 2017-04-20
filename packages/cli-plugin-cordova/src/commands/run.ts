import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ERROR_SHELL_COMMAND_NOT_FOUND,
  TaskChain,
  validators,
} from '@ionic/cli-utils';
import {
  generateBuildOptions,
  filterArgumentsForCordova,
  CORDOVA_INTENT
} from '../lib/utils/cordova';
import { resetConfigXmlContentSrc, writeConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import {
  arePluginsInstalled,
  getProjectPlatforms,
  installPlatform,
  installPlugins
} from '../lib/utils/setup';

/**
 * Metadata about the run command
 */
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
      name: 'emulator',
      description: 'Deploy Cordova build to an emulator',
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
export class RunCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const isLiveReload = options['livereload'];

    const runPlatform = inputs[0];
    if (runPlatform === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot run iOS unless you are on Mac OSX.');
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

    // If it is not livereload then just run build.
    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);
      tasks.end();

      await this.env.hooks.fire('command:build', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      });

      tasks.next('Starting build');
    } else {
      tasks.end();

      const serverSettings = (await this.env.hooks.fire('command:serve', {
        env: this.env,
        inputs,
        options: generateBuildOptions(this.metadata, options),
      }))[0];

      await writeConfigXmlContentSrc(this.env.project.directory, `http://${serverSettings.publicIp}:${serverSettings.httpPort}`);
      tasks.next('Starting server');
    }

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);
    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);

    try {
      await this.env.shell.run('cordova', optionList, {
        showExecution: this.env.log.level === 'debug',
        fatal: false,
      });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw this.exit(`The Cordova CLI was not found on your PATH. Please install Cordova globally:\n\n` +
                        `${chalk.green('npm install -g cordova')}\n`);
      }

      throw e;
    }

    tasks.end();
  }
}
