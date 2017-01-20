import * as os from 'os';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell
} from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetSrcContent } from '../lib/utils/configXmlUtils';
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
  inputs: [
    {
      name: 'platform',
      description: 'the platform that you would like to build'
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
    const runPlatform = inputs[0] || 'ios';

    if (runPlatform === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot run iOS unless you are on Mac OSX.');
      return;
    }

    await Promise.all([
      getProjectPlatforms(this.env.project.directory).then((platforms): Promise<string | void> => {
        if (platforms.includes(runPlatform)) {
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

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    /**
     *
     */
    const optionList: string[] = filterArgumentsForCordova('build', inputs, options);
    await new Shell().run('cordova', optionList);
  }
}
