import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell,
  TaskChain,
  validators
} from '@ionic/cli-utils';
import {
  filterArgumentsForCordova,
  generateAppScriptsArguments
} from '../lib/utils/cordova';
import { getAvailableIPAddress } from '../lib/utils/network';
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
  description: 'Run an Ionic project on a connected device',
  exampleCommands: ['ios --livereload -c -s'],
  inputs: [
    {
      name: 'platform',
      description: `the platform to run: ${chalk.bold('ios')}, ${chalk.bold('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to run: ${chalk.bold('ios')}, ${chalk.bold('android')}`
      }
    }
  ],
  options: [
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
      description: 'Dev server HTTP port (8100 default)',
      default: '8100',
      aliases: ['p']
    },
    {
      name: 'livereload-port',
      description: 'Live Reload port (35729 default)',
      default: '35729',
      aliases: ['r']
    },
    {
      name: 'debug|--release',
      description: '',
      type: Boolean,
    },
    {
      name: 'device|--emulator|--target=FOO',
      description: ''
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

    /**
     * If it is not livereload then just run build.
     */
    let currentTask;

    // We are using require because app-scripts reads process.argv during parse
    const appScriptsArgs = generateAppScriptsArguments(this.metadata, inputs, options);
    process.argv = appScriptsArgs;
    const appScripts = require('@ionic/app-scripts');
    const context = appScripts.generateContext();

    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);

      currentTask = tasks.next(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
      currentTask.end();

      await appScripts.build(context);
    } else {

      const availableIPs = getAvailableIPAddress();
      let chosenIP = availableIPs[0];
      if (availableIPs.length > 1) {
        const promptAnswers = await this.env.inquirer.prompt({
          type: 'list',
          name: 'ip',
          message: 'Multiple addresses available. Please select which address to use:',
          choices: availableIPs.map(ip => ip.address)
        });
        chosenIP = promptAnswers['ip'];
      }

      // using app-scripts and livereload is requested
      // Also remove commandName from the rawArgs passed
      currentTask = tasks.next(`Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))}`);
      currentTask.end();

      const serverSettings = await appScripts.serve(context);
      await writeConfigXmlContentSrc(this.env.project.directory, `http://${chosenIP}:${serverSettings.httpPort}`);
    }

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);
    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
