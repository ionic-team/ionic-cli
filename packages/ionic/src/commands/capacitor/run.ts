import chalk from 'chalk';
import * as path from 'path';

import { validators } from '@ionic/cli-framework';
import { onBeforeExit, sleepForever } from '@ionic/cli-framework/utils/process';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '@ionic/cli-utils';
import { build } from '@ionic/cli-utils/lib/build';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from '@ionic/cli-utils/lib/integrations/capacitor/config';
import { generateOptionsForCapacitorBuild } from '@ionic/cli-utils/lib/integrations/capacitor/utils';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, serve } from '@ionic/cli-utils/lib/serve';

import { CapacitorCommand } from './base';

export class RunCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    let groups: string[] = [];
    const options: CommandMetadataOption[] = [
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build',
        type: Boolean,
        default: true,
      },
      ...COMMON_SERVE_COMMAND_OPTIONS.filter(o => !['livereload'].includes(o.name)),
      {
        name: 'livereload',
        summary: 'Spin up dev server to live-reload www files',
        type: Boolean,
        aliases: ['l'],
      },
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups = libmetadata.groups || [];
      options.push(...(libmetadata.options || []).filter(o => !existingOpts.includes(o.name)).map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${chalk.dim('(--livereload)')}` })));
    }

    return {
      name: 'run',
      type: 'project',
      summary: 'Copies web assets to each Capacitor native platform',
      description: `
${chalk.green('ionic capacitor run')} will do the following:
- Perform ${chalk.green('ionic build')} (or run the dev server from ${chalk.green('ionic serve')} with the ${chalk.green('--livereload')} option)
- Copy web assets into the specified native platform

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs${chalk.cyan('[1]')}.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/developer-resources/developer-tips/')}
      `,
      exampleCommands: [
        '',
        '-l',
      ],
      inputs: [
        {
          name: 'platform',
          summary: `The platform to run (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options,
      groups,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to run?',
        choices: ['android', 'ios'],
      });

      inputs[0] = platform.trim();
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic cordova run/emulate')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    if (options['livereload']) {
      const conf = new CapacitorConfig(path.resolve(this.project.directory, CAPACITOR_CONFIG_FILE));

      // TODO: use runner directly
      const details = await serve({ flags: this.env.flags, config: this.env.config, log: this.env.log, prompt: this.env.prompt, shell: this.env.shell, project: this.project }, inputs, generateOptionsForCapacitorBuild(inputs, options));

      if (details.externallyAccessible === false) {
        const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${chalk.bold(details.externalAddress)}.${extra}\n\n`);
      }

      conf.setServerUrl(`${details.protocol || 'http'}://${details.externalAddress}:${details.port}`);

      onBeforeExit(async () => {
        conf.resetServerUrl();
      });
    } else {
      if (options['build']) {
        // TODO: use runner directly
        await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, inputs, generateOptionsForCapacitorBuild(inputs, options));
      }
    }

    // copy assets and capacitor.config.json into place
    await this.runCapacitor(['copy', platform]);

    // TODO: native-run

    this.env.log.nl();
    this.env.log.info(
      'Ready for use in your Native IDE!\n' +
      `To continue, run your project on a device or ${platform === 'ios' ? 'simulator' : 'emulator'} using ${platform === 'ios' ? 'Xcode' : 'Android Studio'}!`
    );

    this.env.log.nl();

    await this.runCapacitor(['open', platform]);

    if (options['livereload']) {
      this.env.log.nl();
      this.env.log.info(
        'Development server will continue running until manually stopped.\n' +
        chalk.yellow('Use Ctrl+C to quit this process')
      );
      await sleepForever();
    }
  }
}
