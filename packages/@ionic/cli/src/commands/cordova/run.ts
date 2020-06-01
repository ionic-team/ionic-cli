import { Footnote, MetadataGroup, validators } from '@ionic/cli-framework';
import { onBeforeExit, sleepForever } from '@ionic/utils-process';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun, IShellRunOptions, ServeDetails } from '../../definitions';
import { COMMON_BUILD_COMMAND_OPTIONS } from '../../lib/build';
import { input, strong, weak } from '../../lib/color';
import { FatalException, RunnerException } from '../../lib/errors';
import { getPackagePath } from '../../lib/integrations/cordova/project';
import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../../lib/integrations/cordova/utils';
import { SUPPORTED_PLATFORMS, checkNativeRun, createNativeRunArgs, createNativeRunListArgs, getNativeTargets, runNativeRun } from '../../lib/native-run';
import { COMMON_SERVE_COMMAND_OPTIONS, LOCAL_ADDRESSES } from '../../lib/serve';
import { createPrefixedWriteStream } from '../../lib/utils/logger';

import { CORDOVA_BUILD_EXAMPLE_COMMANDS, CORDOVA_RUN_OPTIONS, CordovaCommand } from './base';

const debug = Debug('ionic:commands:run');

const NATIVE_RUN_OPTIONS: readonly CommandMetadataOption[] = [
  {
    name: 'native-run',
    summary: `Do not use ${input('native-run')} to run the app; use Cordova instead`,
    type: Boolean,
    default: true,
    groups: ['native-run'],
    hint: weak('[native-run]'),
  },
  {
    name: 'connect',
    summary: 'Tie the running app to the process',
    type: Boolean,
    groups: ['native-run'],
    hint: weak('[native-run] (--livereload)'),
  },
  {
    name: 'json',
    summary: `Output targets in JSON`,
    type: Boolean,
    groups: [MetadataGroup.ADVANCED, 'native-run'],
    hint: weak('[native-run] (--list)'),
  },
];

export class RunCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const groups: string[] = [];
    const exampleCommands = [
      ...CORDOVA_BUILD_EXAMPLE_COMMANDS,
      'android -l',
      'ios --livereload --external',
      'ios --livereload-url=http://localhost:8100',
    ].sort();

    let options: CommandMetadataOption[] = [
      {
        name: 'list',
        summary: 'List all available targets',
        type: Boolean,
        groups: ['cordova', 'cordova-cli', 'native-run'],
      },
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build',
        type: Boolean,
        default: true,
      },
      ...COMMON_BUILD_COMMAND_OPTIONS.filter(o => !['engine', 'platform'].includes(o.name)),
      // Serve Options
      ...COMMON_SERVE_COMMAND_OPTIONS.filter(o => !['livereload'].includes(o.name)).map(o => ({ ...o, hint: weak('(--livereload)') })),
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
      {
        id: 'livereload-docs',
        url: 'https://ionicframework.com/docs/cli/livereload',
        shortUrl: 'https://ion.link/livereload-docs',
      },
      {
        id: 'native-run-repo',
        url: 'https://github.com/ionic-team/native-run',
      },
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups.push(...libmetadata.groups || []);
      options.push(...(libmetadata.options || []).filter(o => o.groups && o.groups.includes('cordova')));
      footnotes.push(...libmetadata.footnotes || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups.push(...libmetadata.groups || []);
      const runnerOpts = (libmetadata.options || [])
        .filter(o => !existingOpts.includes(o.name) && o.groups && o.groups.includes('cordova'))
        .map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${weak('(--livereload)')}` }));
      options = lodash.uniqWith([...runnerOpts, ...options], (optionA, optionB) => optionA.name === optionB.name);
      footnotes.push(...libmetadata.footnotes || []);
    }

    // Cordova Options
    options.push(...CORDOVA_RUN_OPTIONS);

    // `native-run` Options
    options.push(...NATIVE_RUN_OPTIONS);

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
Build your app and deploy it to devices and emulators using this command. Optionally specify the ${input('--livereload')} option to use the dev server from ${input('ionic serve')} for livereload functionality.

This command will first use ${input('ionic build')} to build web assets (or ${input('ionic serve')} with the ${input('--livereload')} option). Then, ${input('cordova build')} is used to compile and prepare your app. Finally, the ${input('native-run')} utility[^native-run-repo] is used to run your app on a device. To use Cordova for this process instead, use the ${input('--no-native-run')} option.

If you have multiple devices and emulators, you can target a specific one with the ${input('--target')} option. You can list targets with ${input('--list')}.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs[^remote-debugging-docs].

When using ${input('--livereload')} with hardware devices, remember that livereload needs an active connection between device and computer. In some scenarios, you may need to host the dev server on an external address using the ${input('--external')} option. See these docs[^livereload-docs] for more information.

Just like with ${input('ionic cordova build')}, you can pass additional options to the Cordova CLI using the ${input('--')} separator. To pass additional options to the dev server, consider using ${input('ionic serve')} separately and using the ${input('--livereload-url')} option.
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
    if (options['native-run']) {
      await this.checkNativeRun();
    }

    await this.preRunChecks(runinfo);

    const metadata = await this.getMetadata();

    if (options['noproxy']) {
      this.env.log.warn(`The ${input('--noproxy')} option has been deprecated. Please use ${input('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }

    if (options['livereload-url']) {
      options['livereload'] = true;
    }

    if (!options['build'] && options['livereload']) {
      this.env.log.warn(`No livereload with ${input('--no-build')}.`);
      options['livereload'] = false;
    }

    // If we're using the emulate command, and if --device and --emulator are
    // not used, we should set the --emulator flag to mark intent.
    if (!options['device'] && !options['emulator'] && metadata.name === 'emulate') {
      options['emulator'] = true;
    }

    if (options['list']) {
      if (options['native-run']) {
        const args = createNativeRunListArgs(inputs, options);
        await this.runNativeRun(args);
      } else {
        const args = filterArgumentsForCordova(metadata, options);
        await this.runCordova(['run', ...args.slice(1)], {});
      }

      throw new FatalException('', 0);
    }

    if (!inputs[0]) {
      const p = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to run (${['android', 'ios'].map(v => input(v)).join(', ')}):`,
      });

      inputs[0] = p.trim();
    }

    const [ platform ] = inputs;

    if (platform && options['native-run'] && !SUPPORTED_PLATFORMS.includes(platform)) {
      this.env.log.warn(`${input(platform)} is not supported by ${input('native-run')}. Using Cordova to run the app.`);
      options['native-run'] = false;
    }

    // If we're using native-run, and if --device and --emulator are not used,
    // we can detect if hardware devices are plugged in and prefer them over
    // any virtual devices the host has.
    if (options['native-run'] && !options['device'] && !options['emulator'] && platform) {
      const platformTargets = await getNativeTargets(this.env, platform);
      const { devices } = platformTargets;

      debug(`Native platform devices: %O`, devices);

      if (devices.length > 0) {
        this.env.log.info(`Hardware device(s) found for ${input(platform)}. Using ${input('--device')}.`);
        options['device'] = true;
      }
    }

    await this.checkForPlatformInstallation(platform);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    try {
      if (options['livereload']) {
        await this.runServeDeploy(inputs, options);
      } else {
        await this.runBuildDeploy(inputs, options);
      }
    } catch (e) {
      if (e instanceof RunnerException) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  protected async runServeDeploy(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { loadCordovaConfig } = await import('../../lib/integrations/cordova/config');
    const conf = await loadCordovaConfig(this.integration);
    const metadata = await this.getMetadata();

    if (!this.project) {
      throw new FatalException(`Cannot run ${input(`ionic cordova ${metadata.name}`)} outside a project directory.`);
    }

    const runner = await this.project.requireServeRunner();
    const runnerOpts = runner.createOptionsFromCommandLine(inputs, generateOptionsForCordovaBuild(metadata, inputs, options));

    /**
     * With the --livereload-url option, this command won't perform a serve. If
     * this is the case, details will be undefined.
     */
    let details: ServeDetails | undefined;
    let serverUrl = options['livereload-url'] ? String(options['livereload-url']) : undefined;

    if (!serverUrl) {
      details = await runner.run(runnerOpts);

      if (details.externallyAccessible === false && !options['native-run']) {
        const extra = LOCAL_ADDRESSES.includes(details.externalAddress) ? '\nEnsure you have proper port forwarding setup from your device to your computer.' : '';
        this.env.log.warn(`Your device or emulator may not be able to access ${strong(details.externalAddress)}.${extra}\n\n`);
      }

      serverUrl = `${details.protocol || 'http'}://${details.externalAddress}:${details.port}`;
    }

    onBeforeExit(async () => {
      conf.resetContentSrc();
      await conf.save();
    });

    conf.writeContentSrc(serverUrl);
    await conf.save();

    const cordovalogws = createPrefixedWriteStream(this.env.log, weak(`[cordova]`));
    const buildOpts: IShellRunOptions = { stream: cordovalogws };
    // ignore very verbose compiler output on stdout unless --verbose
    buildOpts.stdio = options['verbose'] ? 'inherit' : ['pipe', 'ignore', 'pipe'];

    if (options['native-run']) {
      const [ platform ] = inputs;

      await this.runCordova(filterArgumentsForCordova({ ...metadata, name: 'build' }, options), buildOpts);

      const packagePath = await getPackagePath(this.integration.root, conf.getProjectInfo().name, platform, { emulator: !options['device'], release: !!options['release'] });
      const forwardedPorts = details ? runner.getUsedPorts(runnerOpts, details) : [];

      await this.runNativeRun(createNativeRunArgs({ packagePath, platform, forwardedPorts }, options));
    } else {
      await this.runCordova(filterArgumentsForCordova(metadata, options), buildOpts);
      await sleepForever();
    }
  }

  protected async runBuildDeploy(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { loadCordovaConfig } = await import('../../lib/integrations/cordova/config');
    const conf = await loadCordovaConfig(this.integration);
    const metadata = await this.getMetadata();

    if (!this.project) {
      throw new FatalException(`Cannot run ${input(`ionic cordova ${metadata.name}`)} outside a project directory.`);
    }

    if (options.build) {
      try {
        const runner = await this.project.requireBuildRunner();
        const runnerOpts = runner.createOptionsFromCommandLine(inputs, generateOptionsForCordovaBuild(metadata, inputs, options));
        await runner.run(runnerOpts);
      } catch (e) {
        if (e instanceof RunnerException) {
          throw new FatalException(e.message);
        }

        throw e;
      }
    }

    if (options['native-run']) {
      const [ platform ] = inputs;

      await this.runCordova(filterArgumentsForCordova({ ...metadata, name: 'build' }, options), { stdio: 'inherit' });

      const packagePath = await getPackagePath(this.integration.root, conf.getProjectInfo().name, platform, { emulator: !options['device'], release: !!options['release'] });

      await this.runNativeRun(createNativeRunArgs({ packagePath, platform }, { ...options, connect: false }));
    } else {
      await this.runCordova(filterArgumentsForCordova(metadata, options), { stdio: 'inherit' });
    }
  }

  protected async checkNativeRun(): Promise<void> {
    await checkNativeRun(this.env);
  }

  protected async runNativeRun(args: readonly string[]): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova run/emulate')} outside a project directory.`);
    }

    await runNativeRun(this.env, args, { cwd: this.integration.root });
  }
}
