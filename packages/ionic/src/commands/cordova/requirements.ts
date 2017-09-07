import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { isExitCodeException } from '@ionic/cli-utils/guards';

import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'requirements',
  type: 'project',
  description: 'Checks and print out all the requirements for platforms',
  longDescription: `
Like running ${chalk.green('cordova requirements')} directly, but provides friendly checks.
  `,
  inputs: [
    {
      name: 'platform',
      description: `The platform for which you would like to gather requirements (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
      required: false,
    },
  ]
})
export class RequirementsCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { installPlatform } = await import('@ionic/cli-utils/lib/cordova/project');
    const { filterArgumentsForCordova } = await import('@ionic/cli-utils/lib/cordova/utils');

    const [ platform ] = inputs;

    let conf = await ConfigXml.load(this.env.project.directory);

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
          throw this.exit(
            `Can't gather requirements for ${chalk.green(platform)} unless the platform is installed.\n` +
            `Did you mean just ${chalk.green('ionic cordova requirements')}?\n`
          );
        }
      }
    }

    conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    try {
      await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options), { showExecution: true, showError: false, fatalOnError: false });
    } catch (e) {
      if (e.fatal || !isExitCodeException(e)) {
        throw e;
      }

      return 1;
    }
  }
}
