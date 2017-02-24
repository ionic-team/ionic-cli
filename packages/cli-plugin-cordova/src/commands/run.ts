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
  generateAppScriptsArguments,
  CORDOVA_INTENT
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
      name: 'prod',
      description: 'Create a prod build with app-scripts',
      type: Boolean
    },
    // Cordova Options
    {
      name: 'list',
      description: 'List all available cordova run targets',
      type: Boolean,
      intent: CORDOVA_INTENT
    },
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
    },
    {
      name: 'target',
      description: 'Deploy cordova build to a device. Options available with --list.',
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

    /**
     * If it is not livereload then just run build.
     */

    // We are using require because app-scripts reads process.argv during parse
    const appScriptsArgs = generateAppScriptsArguments(this.metadata, inputs, options);
    process.argv = appScriptsArgs;
    const appScripts = require('@ionic/app-scripts');
    const context = appScripts.generateContext();

    if (!isLiveReload) {

      // ensure the content node was set back to its original
      await resetConfigXmlContentSrc(this.env.project.directory);

      this.env.log.msg(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
      await appScripts.build(context);
      tasks.next(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
    } else {

      const availableIPs = getAvailableIPAddress();
      if (availableIPs.length === 0) {
        this.env.log.error(`It appears that you do not have any external network interfaces. ` +
          `In order to use livereload with emulate you will need one.`
        );
      }
      let chosenIP = availableIPs[0].address;
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
      this.env.log.msg(`  Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))}`);
      const serverSettings = await appScripts.serve(context);
      tasks.next(`Starting app-scripts server`);
      await writeConfigXmlContentSrc(this.env.project.directory, `http://${chosenIP}:${serverSettings.httpPort}`);
    }

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);
    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await this.env.shell.run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
