import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

import { DeployConfCommand } from './core';

export class AddCommand extends DeployConfCommand {
  async getMetadata(): Promise<CommandMetadata> {

    return {
      name: 'add',
      type: 'project',
      summary: 'Adds the Deploy plugin (cordova-plugin-ionic) to the project',
      description: `
This command adds the Deploy plugin (cordova-plugin-ionic) for both Cordova and Capacitor projects.

For a Cordova project it just takes care of running the proper Cordova CLI command with the submitted parameters.

For a Capacitor project it runs all the steps necessary to install the plugin, sync with the native projects and
add the configuration to the proper iOS and Android configuration files.
      `,
      exampleCommands: [
        '',
        '--app-id="abcd1234" --channel-name="Master" --update-method="background"',
        '--max-store=2 --min-background-duration=30',
        '--app-id="abcd1234" --channel-name="Master" --update-method="background" --max-store=2 --min-background-duration=30',
      ],
      options: this.commandOptions,
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
    // check if it is already installed
    const alreadyAdded = await this.checkDeployInstalled();
    if (alreadyAdded) {
      throw new FatalException(
        `Deploy (cordova-plugin-ionic) already installed`
      );
    }
    // check if there are native integration installed
    await this.requireNativeIntegration();
    await this.preRunCheckInputs(options);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const integration = await this.getAppIntegration();
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
      const shellOptions = {
        stdio: 'inherit',
        save: true,
      };
      const [ installer, ...installerArgs ] = await pkgManagerArgs(
        this.env.config.get('npmClient'),
        { command: 'install', pkg: 'cordova-plugin-ionic' }
      );
      // install the plugin with npm
      await this.env.shell.run(installer, installerArgs, shellOptions);
      // generate the manifest
      await runCommand(runinfo, ['deploy', 'manifest']);
      // run capacitor sync
      await runCommand(runinfo, ['capacitor', 'sync']);
      // update the ios project if present
      await this.addConfToIosPlist(options);
      // update the android project if present
      await this.addConfToAndroidString(options);
    }

    this.env.log.ok(`Deploy (cordova-plugin-ionic) added to the project\n`);
  }

}
