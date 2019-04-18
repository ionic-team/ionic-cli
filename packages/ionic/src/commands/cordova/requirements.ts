import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { isExitCodeException } from '../../guards';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { filterArgumentsForCordova } from '../../lib/integrations/cordova/utils';

import { CordovaCommand } from './base';

export class RequirementsCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'requirements',
      type: 'project',
      summary: 'Checks and print out all the requirements for platforms',
      description: `
Like running ${input('cordova requirements')} directly, but provides friendly checks.
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform for which you would like to gather requirements (${['android', 'ios'].map(v => input(v)).join(', ')})`,
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova requirements')} outside a project directory.`);
    }

    await this.checkForPlatformInstallation(platform, {
      promptToInstall: true,
      promptToInstallRefusalMsg: (
        `Can't gather requirements for ${input(platform)} unless the platform is installed.\n` +
        `Did you mean just ${input('ionic cordova requirements')}?\n`
      ),
    });

    const metadata = await this.getMetadata();

    try {
      await this.runCordova(filterArgumentsForCordova(metadata, options), { showError: false, fatalOnError: false });
    } catch (e) {
      if (e.fatal || !isExitCodeException(e)) {
        throw e;
      }

      throw new FatalException();
    }
  }
}
