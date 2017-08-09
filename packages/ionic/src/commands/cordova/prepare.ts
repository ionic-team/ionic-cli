import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';

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
    await this.preRunChecks();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { installPlatform } = await import('@ionic/cli-utils/lib/cordova/project');
    const { filterArgumentsForCordova } = await import('@ionic/cli-utils/lib/cordova/utils');

    const [ platform ] = inputs;

    const conf = await ConfigXml.load(this.env.project.directory);

    if (platform) {
      const platformEngine = await conf.getPlatformEngine(platform);

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
    } else {
      const platformEngines = await conf.getPlatformEngines();

      if (platformEngines.length === 0) {
        this.env.log.warn(
          `No Cordova platforms listed in ${chalk.bold('config.xml')}. Nothing to prepare.\n` +
          `You can save your installed platforms to ${chalk.bold('config.xml')} with the ${chalk.green('ionic cordova platform save')} command.`
        );

        return 0;
      }
    }

    await conf.resetContentSrc();
    await conf.save();

    const response = await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), {});
    this.env.log.msg(response);
  }
}
