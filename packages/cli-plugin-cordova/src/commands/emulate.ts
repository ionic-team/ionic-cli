import * as os from 'os';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli-utils';
import { resetSrcContent } from '../lib/utils/configXmlUtils';
import {
  arePluginsInstalled,
  getProjectPlatforms,
  installPlatform,
  installPlugins
} from '../lib/utils/setup';

/**
 * Metadata about the emulate command
 */
@CommandMetadata({
  name: 'emulate',
  description: 'Emulate an Ionic project on a simulator or emulator',
  inputs: [
    {
      name: 'platform',
      description: 'the platform to emulate',
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
export class EmulateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    var hasBuildCommand = false;
    var hasServeCommand = false;

    var isLiveReload = options['livereload'];

    const runPlatform = inputs[0] || 'ios';

    if (runPlatform === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot run iOS unless you are on Mac OSX.');
      return;
    }

    await Promise.all([
      getProjectPlatforms(this.env.project.directory).then((platforms): Promise<string | void> => {
        if (platforms.indexOf(runPlatform) === -1) {
          return installPlatform(runPlatform);
        }
        return Promise.resolve();
      }),
      arePluginsInstalled(this.env.project.directory).then((areInstalled): Promise<string[] | void> => {
        if (!areInstalled) {
          return installPlugins();
        }
        return Promise.resolve();
      })
    ]);

    /**
     * If it is not livereload then just run build.
     */
    if (!isLiveReload) {
      return npmScripts.runIonicScript('build', inputs, options);
    }

    // using app-scripts and livereload is requested
    // Also remove commandName from the rawArgs passed
    await cordovaUtils.startAppScriptsServer(inputs, options);

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    var optionList: string[] = filterArgumentsForCordova('emulate', inputs, options);
    await new Shell().run('cordova', optionList);
  }
}
