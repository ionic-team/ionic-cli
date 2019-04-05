import { CommandGroup, Footnote, validators } from '@ionic/cli-framework';
import { onBeforeExit, sleepForever } from '@ionic/utils-process';
import chalk from 'chalk';
import * as path from 'path';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../../definitions';
import { build } from '../../lib/build';
import { input, strong, weak } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from '../../lib/integrations/capacitor/config';
import { generateOptionsForCapacitorBuild } from '../../lib/integrations/capacitor/utils';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES, serve } from '../../lib/serve';

import { CapacitorCommand } from './base';

export class RunCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    let groups: string[] = [CommandGroup.Beta];
    const exampleCommands = [
      '',
      'android',
      'android -l',
      'ios --livereload',
      'ios --livereload-url=http://localhost:8100',
    ].sort();

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
      {
        name: 'livereload-url',
        summary: 'Provide a custom URL to the dev server',
        spec: { value: 'url' },
      },
    ];

    const footnotes: Footnote[] = [
      {
        id: 'remote-debugging-docs',
        url: 'https://ionicframework.com/docs/developer-resources/developer-tips',
        shortUrl: 'https://ion.link/remote-debugging-docs',
      },
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
      footnotes.push(...libmetadata.footnotes || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups = libmetadata.groups || [];
      options.push(...(libmetadata.options || []).filter(o => !existingOpts.includes(o.name)).map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${weak('(--livereload)')}` })));
      footnotes.push(...libmetadata.footnotes || []);
    }

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
${input('ionic capacitor run')} will do the following:
- Perform ${input('ionic build')} (or run the dev server from ${input('ionic serve')} with the ${input('--livereload')} option)
- Copy web assets into the specified native platform
- Open the IDE for your native project (Xcode for iOS, Android Studio for Android)

Once the web assets and configuration are copied into your native project, the app can run on devices and emulators/simulators using the native IDE. Unfortunately, programmatically building and launching the native project is not yet supported.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs[^remote-debugging-docs].
      `,
      footnotes,
      exampleCommands,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to run (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
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

    if (options['livereload-url']) {
      options['livereload'] = true;
    }

    if (!options['build'] && options['livereload']) {
      this.env.log.warn(`No livereload with ${input('--no-build')}.`);
      options['livereload'] = false;
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova run/emulate')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    if (options['livereload']) {
      let livereloadUrl = options['livereload-url'] ? String(options['livereload-url']) : undefined;

      if (!livereloadUrl) {
        // TODO: use runner directly
        const details = await serve({ flags: this.env.flags, config: this.env.config, log: this.env.log, prompt: this.env.prompt, shell: this.env.shell, project: this.project }, inputs, generateOptionsForCapacitorBuild(inputs, options));

        if (details.externallyAccessible === false) {
          const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
          this.env.log.warn(`Your device or emulator may not be able to access ${strong(details.externalAddress)}.${extra}\n\n`);
        }

        livereloadUrl = `${details.protocol || 'http'}://${details.externalAddress}:${details.port}`;
      }

      const conf = new CapacitorConfig(path.resolve(this.project.directory, CAPACITOR_CONFIG_FILE));

      onBeforeExit(async () => {
        conf.resetServerUrl();
      });

      conf.setServerUrl(livereloadUrl);

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
