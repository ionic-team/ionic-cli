import { CommandLineInputs, CommandLineOptions, MetadataGroup } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { DeployConfCommand } from './core';

export class ConfigureCommand extends DeployConfCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'configure',
      type: 'project',
      groups: [MetadataGroup.HIDDEN],
      summary: 'Overrides Appflow Deploy configuration',
      description: `
This command overrides configuration for the Appflow Deploy plugin (${input('cordova-plugin-ionic')}) in Capacitor projects.

For Capacitor projects, if the plugin is already installed, it overrides the configuration variables in the native projects.

For Cordova projects this is not implemented because it is better to reinstall the plugin with the different parameters and let Cordova deal with the changes.
      `,
      exampleCommands: [
        '',
        '--app-id=abcd1234 --channel-name="Master" --update-method=background',
        '--max-store=2 --min-background-duration=30',
        '--app-id=abcd1234 --channel-name="Master" --update-method=background --max-store=2 --min-background-duration=30',
        'android',
        'ios',
      ],
      options: this.commandOptions,
      inputs: [
        {
          name: 'platform',
          summary: `The native platform (e.g. ${['ios', 'android'].map(v => input(v)).join(', ')})`,
        },
      ],
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
    // check if there are native integration installed
    await this.requireNativeIntegration();
    // check that if an input is provided, it is valid
    if (inputs[0] && !['ios', 'android'].includes(inputs[0])) {
      throw new FatalException(`Only ${input('ios')} or ${input('android')} can be used.`);
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
      // check if there is an input that matches only one
      const updateIos = !inputs[0] || (inputs[0] === 'ios');
      const updateAndroid = !inputs[0] || (inputs[0] === 'android');

      // update the ios project if present
      if (updateIos) {
        await this.addConfToIosPlist(options);
      }
      // update the android project if present
      if (updateAndroid) {
        await this.addConfToAndroidString(options);
      }
      this.env.log.ok(`Deploy (cordova-plugin-ionic) configs successfully overridden for the project\n`);
    }
  }
}
