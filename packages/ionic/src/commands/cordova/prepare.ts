import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/project/ionic-angular/app-scripts';

import { CordovaCommand } from './base';

export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'prepare',
      type: 'project',
      summary: 'Copies assets to Cordova platforms, preparing them for native builds',
      description: `
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
          summary: `The platform you would like to prepare (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options: [
        {
          name: 'build',
          summary: 'Do not invoke an Ionic build',
          type: Boolean,
          default: true,
        },
        ...APP_SCRIPTS_OPTIONS,
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/integrations/cordova/project');

    const [ platform ] = inputs;

    const platforms = await getPlatforms(this.env.project.directory);

    if (platform) {
      if (!platforms.includes(platform)) {
        const confirm = await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        });

        if (confirm) {
          await installPlatform(this.env, platform);
        } else {
          throw new FatalException(
            `Can't prepare for ${chalk.green(platform)} unless the platform is installed.\n` +
            `Did you mean just ${chalk.green('ionic cordova prepare')}?\n`
          );
        }
      }
    } else {
      if (platforms.length === 0) {
        this.env.log.warn(`No platforms installed. See ${chalk.green('ionic cordova platform add --help')} to add Cordova platforms.`);
        return;
      }
    }

    const metadata = await this.getMetadata();

    if (options.build) {
      const { build } = await import('@ionic/cli-utils/lib/build');
      await build(this.env, inputs, generateBuildOptions(metadata, inputs, options));
    }

    await this.runCordova(filterArgumentsForCordova(metadata, options), {});
  }
}
