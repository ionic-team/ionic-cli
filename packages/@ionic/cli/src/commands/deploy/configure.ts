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
      groups: [MetadataGroup.PAID],
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
      options: [
        {
          name: 'app-id',
          summary: 'Your Appflow app ID',
          type: String,
          spec: { value: 'id' },
        },
        {
          name: 'channel-name',
          summary: 'The channel to check for updates from',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'update-method',
          summary: 'The update method that dictates the behavior of the plugin',
          type: String,
          spec: { value: 'name' },
        },
        {
          name: 'max-store',
          summary: 'The maximum number of downloaded versions to store on the device',
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'quantity' },
        },
        {
          name: 'min-background-duration',
          summary: 'The minimum duration after which the app checks for an update in the background',
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'seconds' },
        },
        {
          name: 'update-api',
          summary: 'The location of the Appflow API',
          type: String,
          groups: [MetadataGroup.HIDDEN],
          spec: { value: 'url' },
        },
      ],
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
      let printOkMessage = false;
      if (updateIos) {
        printOkMessage = await this.addConfToIosPlist(options);
      }
      // update the android project if present
      if (updateAndroid) {
        printOkMessage = await this.addConfToAndroidString(options);
      }
      if (printOkMessage) {
        this.env.log.ok(`Deploy (cordova-plugin-ionic) configs successfully overridden for the project\n`);
      }
    }
  }
}
