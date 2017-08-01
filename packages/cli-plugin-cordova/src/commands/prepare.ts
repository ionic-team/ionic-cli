import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
} from '@ionic/cli-utils';

import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { installPlatform } from '../lib/utils/setup';
import { ConfigXml } from '../lib/utils/configXml';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'prepare',
  type: 'project',
  description: 'Copies assets to Cordova platforms, preparing them for native builds',
  longDescription: `
${chalk.green('ionic cordova prepare')} will do the following:
- Copy the ${chalk.bold('www/')} directory into your Cordova platforms.
- Transform ${chalk.bold('config.xml')} into platform-specific manifest files.
- Copy icons and splash screens from ${chalk.bold('resources/')} to into your Cordova platforms.
- Copy plugin files into specified platforms.

You may wish to use ${chalk.green('ionic cordova prepare')} if you run your project with Android Studio or Xcode.
  `,
  exampleCommands: ['', 'ios', 'android'],
  inputs: [
    {
      name: 'platform',
      description: `The platform you would like to prepare (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
      required: false,
    },
  ]
})
export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForAssetsFolder();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;

    if (platform) {
      const conf = await ConfigXml.load(this.env.project.directory);
      const platformEngine = conf.getPlatformEngine(platform);

      if (!platformEngine) {
        const confirm = await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        });

        if (confirm) {
          await installPlatform(this.env, platform);
        } else {
          throw this.exit(`Can't prepare for ${chalk.green(platform)} unless the platform is installed. Did you mean just ${chalk.green('ionic cordova prepare')}?`);
        }
      }
    }

    const conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), {});
    this.env.log.msg(response);
  }
}
