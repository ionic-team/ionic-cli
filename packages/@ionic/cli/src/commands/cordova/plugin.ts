import { MetadataGroup, contains, validate, validators } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { filterArgumentsForCordova } from '../../lib/integrations/cordova/utils';
import { pkgManagerArgs } from '../../lib/utils/npm';

import { CordovaCommand } from './base';

export class PluginCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'plugin',
      type: 'project',
      summary: 'Manage Cordova plugins',
      description: `
Like running ${input('cordova plugin')} directly, but provides friendly checks.
      `,
      exampleCommands: ['', 'add cordova-plugin-inappbrowser@latest', 'add phonegap-plugin-push --variable SENDER_ID=XXXXX', 'rm cordova-plugin-camera'],
      inputs: [
        {
          name: 'action',
          summary: `${input('add')} or ${input('remove')} a plugin; ${input('ls')} or ${input('save')} all project plugins`,
        },
        {
          name: 'plugin',
          summary: `The name of the plugin (corresponds to ${input('add')} and ${input('remove')})`,
        },
      ],
      options: [
        {
          name: 'force',
          summary: `Force overwrite the plugin if it exists (corresponds to ${input('add')})`,
          type: Boolean,
          groups: [MetadataGroup.ADVANCED, 'cordova', 'cordova-cli'],
        },
        {
          name: 'variable',
          summary: 'Specify plugin variables',
          groups: ['cordova', 'cordova-cli'],
          spec: { value: 'KEY=VALUE' },
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException('Cannot use Cordova outside a project directory.');
    }

    const capacitor = this.project.getIntegration('capacitor');

    if (capacitor && capacitor.enabled) {
      const pkg = inputs[1] ? inputs[1] : '<package>';
      const installArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg, save: false, saveExact: false });
      const uninstallArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'uninstall', pkg, save: false });

      throw new FatalException(
        `Refusing to run ${input('ionic cordova plugin')} inside a Capacitor project.\n` +
        `In Capacitor projects, Cordova plugins are just regular npm dependencies.\n\n` +
        `- To add a plugin, use ${input(installArgs.join(' '))}\n` +
        `- To remove, use ${input(uninstallArgs.join(' '))}\n`
      );
    }

    await this.preRunChecks(runinfo);

    inputs[0] = !inputs[0] ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    validate(inputs[0], 'action', [contains(['add', 'remove', 'ls', 'save'], {})]);

    // If the action is list then lets just end here.
    if (['ls', 'save'].includes(inputs[0])) {
      await this.runCordova(['plugin', inputs[0]], {});
      throw new FatalException('', 0);
    }

    if (!inputs[1]) {
      const plugin = await this.env.prompt({
        message: `What plugin would you like to ${inputs[0]}:`,
        type: 'input',
        name: 'plugin',
      });

      inputs[1] = plugin;
    }

    validate(inputs[1], 'plugin', [validators.required]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const metadata = await this.getMetadata();
    const cordovaArgs = filterArgumentsForCordova(metadata, options);

    await this.runCordova(cordovaArgs, {});
  }
}
