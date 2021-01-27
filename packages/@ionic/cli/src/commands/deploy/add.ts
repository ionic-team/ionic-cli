import { MetadataGroup } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { runCommand } from '../../lib/executor';

import { DeployConfCommand } from './core';

export class AddCommand extends DeployConfCommand {
  async getMetadata(): Promise<CommandMetadata> {

    return {
      name: 'add',
      type: 'project',
      groups: [MetadataGroup.PAID],
      summary: 'Adds Appflow Deploy to the project',
      description: `
This command adds the Appflow Deploy plugin (${input('cordova-plugin-ionic')}) for both Capacitor and Cordova projects.

For Capacitor projects it runs all the steps necessary to install the plugin, sync with the native projects and add the configuration to the proper iOS and Android configuration files.

For Cordova projects it just takes care of running the proper Cordova CLI command with the submitted parameters.
      `,
      exampleCommands: [
        '',
        '--app-id=abcd1234 --channel-name="Master" --update-method=background',
        '--max-store=2 --min-background-duration=30',
        '--app-id=abcd1234 --channel-name="Master" --update-method=background --max-store=2 --min-background-duration=30',
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
          default: '2',
        },
        {
          name: 'min-background-duration',
          summary: 'The minimum duration after which the app checks for an update in the background',
          type: String,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'seconds' },
          default: '30',
        },
        {
          name: 'update-api',
          summary: 'The location of the Appflow API',
          type: String,
          groups: [MetadataGroup.HIDDEN],
          spec: { value: 'url' },
          default: 'https://api.ionicjs.com',
        },
      ],
    };
  }

  protected buildCordovaDeployOptions(options: CommandLineOptions): string[] {
    const optionsToCordova = {
      'app-id': 'APP_ID',
      'channel-name': 'CHANNEL_NAME',
      'update-method': 'UPDATE_METHOD',
      'max-store': 'MAX_STORE',
      'min-background-duration': 'MIN_BACKGROUND_DURATION',
      'update-api': 'UPDATE_API',
    };
    const outputOptions = [];
    for (const [optionKey, cordovaKey] of Object.entries(optionsToCordova)) {
      if (options[optionKey]) {
        outputOptions.push(`--variable`);
        outputOptions.push(`${cordovaKey}=${options[optionKey]}`);
      }
    }
    return outputOptions;
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // check if there are native integration installed
    await this.requireNativeIntegration();
    await this.preRunCheckInputs(options);
  }

  async addPlugin(options: CommandLineOptions, runinfo: CommandInstanceInfo, integration?: string) {
    if (integration === 'cordova') {
      let deployCommand = ['cordova', 'plugin', 'add', 'cordova-plugin-ionic'];
      const userOptions = this.buildCordovaDeployOptions(options);
      if (userOptions) {
        deployCommand = deployCommand.concat(userOptions);
      }
      await runCommand(runinfo, deployCommand);
    }
    if (integration === 'capacitor') {
      const { pkgManagerArgs } = await import('../../lib/utils/npm');
      const [ installer, ...installerArgs ] = await pkgManagerArgs(
        this.env.config.get('npmClient'),
        { command: 'install', pkg: 'cordova-plugin-ionic' }
      );
      // install the plugin with npm
      await this.env.shell.run(installer, installerArgs, { stdio: 'inherit' });
    }

  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const integration = await this.getAppIntegration();

    // check if it is already installed
    const alreadyAdded = await this.checkDeployInstalled();
    if (!alreadyAdded) {
      await this.addPlugin(options, runinfo, integration);
    } else {
      this.env.log.warn("Live Updates plugin already added. Reconfiguring only.");
    }

    if (integration === 'capacitor') {
      // generate the manifest
      await runCommand(runinfo, ['deploy', 'manifest']);
      // run capacitor sync
      await runCommand(runinfo, ['capacitor', 'sync']);
      // update the ios project if present
      await this.addConfToIosPlist(options);
      // update the android project if present
      await this.addConfToAndroidString(options);
    }

    this.env.log.ok(`Appflow Deploy plugin added to the project!\n`);
  }

}
