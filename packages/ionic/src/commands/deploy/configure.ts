import { CommandLineInputs, CommandLineOptions, MetadataGroup } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { DeployConfCommand } from './core';

export class ConfigureCommand extends DeployConfCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'configure',
      type: 'project',
      groups: [MetadataGroup.HIDDEN],
      summary: 'Overrides the Deploy plugin (cordova-plugin-ionic) configuration in the project',
      description: `
This command overrides the Deploy plugin (cordova-plugin-ionic) configuration Capacitor projects.

In a Capacitor project, if the plugin is already installed, it overrides the configuration variables in the native projects.

For a Cordova project this is not implemented because it is better to reinstall the plugin with the different
paramenters and let Cordova deal with the changes.
      `,
      footnotes: [
        {
          id: 'dashboard',
          url: dashUrl,
        },
      ],
      exampleCommands: [
        '',
        '--app-id="abcd1234" --channel-name="Master" --update-method="background"',
        '--max-store=2 --min-background-duration=30',
        '--app-id="abcd1234" --channel-name="Master" --update-method="background" --max-store=2 --min-background-duration=30',
      ],
      options: this.commandOptions,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // check if it is already installed
    const alreadyAdded = await this.checkDeployInstalled();
    if (!alreadyAdded) {
      throw new FatalException(
        `Deploy (cordova-plugin-ionic) not yet installed.\n` +
        `Please run ${input('ionic deploy add')}`
      );
    }
    await this.preRunCheckInputs(options);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const integration = await this.getAppIntegration();
    if (integration === 'cordova') {
      throw new FatalException(
        `Deploy (cordova-plugin-ionic) configuration cannot be overridden for a Cordova project.\n` +
        `Please uninstall the plugin and run ${input('ionic deploy add')} again.`
      );
    }
    if (integration === 'capacitor') {
      // update the ios project if present
      await this.addConfToIosPlist(options);
      // update the android project if present
      await this.addConfToAndroidString(options);
      this.env.log.ok(`Deploy (cordova-plugin-ionic) configs successfully overridden for the project\n`);
    }
  }
}
