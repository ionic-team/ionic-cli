import { BaseError, Footnote, MetadataGroup, validators } from '@ionic/cli-framework';
import { sleepForever } from '@ionic/utils-process';
import { columnar } from '@ionic/utils-terminal';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as semver from 'semver';

import { COLUMNAR_OPTIONS } from '../../constants';
import { AnyBuildOptions, AnyServeOptions, CapacitorRunHookName, CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../../definitions';
import { ancillary, input, strong, weak } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { Hook, HookDeps } from '../../lib/hooks';
import { getNativeIDEForPlatform, getVirtualDeviceNameForPlatform } from '../../lib/integrations/capacitor/utils';
import { COMMON_SERVE_COMMAND_OPTIONS } from '../../lib/serve';

import { CapacitorCommand } from './base';

const debug = Debug('ionic:commands:capacitor:run');

const PLATFORMS = ['android', 'ios'] as const;

interface NativeTarget {
  id: string;
  name: string;
  api: string;
}

export class RunCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const groups: string[] = [MetadataGroup.BETA];
    const exampleCommands = [
      '',
      'android',
      'android -l --external',
      'ios --livereload --external',
      'ios --livereload-url=http://localhost:8100',
    ].sort();

    let options: CommandMetadataOption[] = [
      {
        name: 'list',
        summary: 'List all available targets',
        type: Boolean,
        groups: ['capacitor', 'native-run'],
        hint: weak('[capacitor]'),
      },
      {
        name: 'target',
        summary: `Deploy to a specific device by its ID (use ${input('--list')} to see all)`,
        type: String,
        groups: ['capacitor', 'native-run'],
        hint: weak('[capacitor]'),
      },
      {
        name: 'open',
        summary: `Open native IDE instead of using ${input('capacitor run')}`,
        type: Boolean,
      },
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build',
        type: Boolean,
        default: true,
      },
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
    ];

    const serveRunner = this.project && await this.project.getServeRunner();
    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups.push(...libmetadata.groups || []);
      options.push(...libmetadata.options || []);
      footnotes.push(...libmetadata.footnotes || []);
    }

    if (serveRunner) {
      const libmetadata = await serveRunner.getCommandMetadata();
      const existingOpts = options.map(o => o.name);
      groups.push(...libmetadata.groups || []);
      const runnerOpts = (libmetadata.options || [])
        .filter(o => !existingOpts.includes(o.name))
        .map(o => ({ ...o, hint: `${o.hint ? `${o.hint} ` : ''}${weak('(--livereload)')}` }));
      options = lodash.uniqWith([...runnerOpts, ...options], (optionA, optionB) => optionA.name === optionB.name);
      footnotes.push(...libmetadata.footnotes || []);
    }

    return {
      name: 'run',
      type: 'project',
      summary: 'Run an Ionic project on a connected device',
      description: `
${input('ionic capacitor run')} will do the following:
- Perform ${input('ionic build')} (or run the dev server from ${input('ionic serve')} with the ${input('--livereload')} option)
- Run ${input('capacitor run')} (or open IDE for your native project with the ${input('--open')} option)

When using ${input('--livereload')} with hardware devices, remember that livereload needs an active connection between device and computer. In some scenarios, you may need to host the dev server on an external address using the ${input('--external')} option. See these docs[^livereload-docs] for more information.

If you have multiple devices and emulators, you can target a specific one by ID with the ${input('--target')} option. You can list targets with ${input('--list')}.

For Android and iOS, you can setup Remote Debugging on your device with browser development tools using these docs[^remote-debugging-docs].
      `,
      footnotes,
      exampleCommands,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to run (e.g. ${PLATFORMS.map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options,
      groups,
    };
  }

  isOldCapacitor = lodash.memoize(async (): Promise<boolean> => {
    const version = await this.getCapacitorVersion();
    return semver.lt(version, '3.0.0-alpha.7');
  });

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (await this.isOldCapacitor()) {
      this.env.log.warn(
        `Support for Capacitor 1 and 2 is deprecated.\n` +
        `Please update to the latest Capacitor. Visit the docs${ancillary('[1]')} for upgrade guides.\n\n` +
        `${ancillary('[1]')}: ${strong('https://capacitorjs.com/docs/')}\n`
      );

      if (options['list']) {
        throw new FatalException(`The ${input('--list')} option is not supported with your Capacitor version.`);
      }

      if (options['target']) {
        throw new FatalException(`The ${input('--target')} option is not supported with your Capacitor version.`);
      }
    }

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: options['list'] ? 'What platform targets would you like to list?' : 'What platform would you like to run?',
        choices: PLATFORMS,
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

    if (!(await this.isOldCapacitor())) {
      const targets = inputs[0] ? await this.getNativeTargets(inputs[0]) : [];

      if (options['list']) {
        if (!inputs[0]) {
          throw new FatalException(`The ${input('platform')} argument is required for the ${input('--list')} option.`);
        }

        if (targets.length > 0) {
          const rows = targets.map(t => [t.name, t.api, t.id]);
          this.env.log.msg(columnar(rows, { ...COLUMNAR_OPTIONS, headers: ['Name', 'API', 'Target ID'] }));
        } else {
          this.env.log.info('No native targets found.');
        }

        throw new FatalException('', 0);
      }

      if (!options['open']) {
        const target = options['target'];

        if (typeof target === 'string') {
          if (!targets.map(t => t.id).find(t => t === target)) {
            throw new FatalException(
              `${input(target)} is not a valid Target ID.\n` +
              `Use the ${input('--list')} option to list all targets.\n`
            );
          }
        } else {
          options['target'] = await this.env.prompt({
            type: 'list',
            name: 'target',
            message: 'Which device would you like to target?',
            choices: targets.map(t => ({ name: `${t.name} (${t.id})`, value: t.id })),
          });

          if (!inputs[0]) {
            throw new FatalException(`The ${input('platform')} argument is required.`);
          }

          if (!options['target']) {
            throw new FatalException(`The ${input('--target')} option is required.`);
          }
        }
      }
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor run')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    const doLiveReload = !!options['livereload'];
    const doOpenFlow = (await this.isOldCapacitor()) || options['open'] === true;

    if (doLiveReload) {
      if (doOpenFlow) {
        await this.runServe(inputs, options);
        await this.runCapacitorOpenFlow(inputs, options);

        this.env.log.nl();
        this.env.log.info(
          'Development server will continue running until manually stopped.\n' +
          chalk.yellow('Use Ctrl+C to quit this process')
        );
      } else {
        await this.runCapacitor(['sync', platform]);
        await this.runServe(inputs, options);
        await this.runCapacitorRunFlow(inputs, options, { shouldSync: false });

        this.env.log.nl();
        this.env.log.info(
          `App deployed to device!\n` +
          'Development server will continue running until manually stopped.\n\n' +
          chalk.yellow('Use Ctrl+C to quit this process')
        );
      }

      await sleepForever();
    } else {
      if (doOpenFlow) {
        await this.runBuild(inputs, options);
        await this.runCapacitor(['sync', platform]);
        await this.runCapacitorOpenFlow(inputs, options);
      } else {
        await this.runBuild(inputs, options);
        await this.runCapacitorRunFlow(inputs, options, { shouldSync: true });
      }
    }
  }

  protected getNativeTargets = lodash.memoize(async (platform: string): Promise<NativeTarget[]> => {
    const args = ['run', platform, '--list', '--json'];

    debug('Getting native targets for %O with Capacitor CLI: %O', platform, args);

    const output = await this.env.shell.cmdinfo('capacitor', args, { cwd: this.integration.root });

    if (!output) {
      return [];
    }

    const targets = JSON.parse(output);

    debug('%O native targets found', targets.length);

    return targets;
  });

  protected async runCapacitorOpenFlow(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor run')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    await this.runCapacitorRunHook('capacitor:run:before', inputs, options, { ...this.env, project: this.project });

    if (options['open'] !== false) {
      this.env.log.nl();
      this.env.log.info(this.getContinueMessage(platform));
      this.env.log.nl();

      await this.runCapacitor(['open', platform]);
    }
  }

  protected getContinueMessage(platform: string): string {
    if (platform === 'electron') {
      return 'Ready to be used in Electron!';
    }

    return (
      'Ready for use in your Native IDE!\n' +
      `To continue, run your project on a device or ${getVirtualDeviceNameForPlatform(platform)} using ${getNativeIDEForPlatform(platform)}!`
    );
  }

  protected async runCapacitorRunFlow(inputs: CommandLineInputs, options: CommandLineOptions, { shouldSync = true }: { shouldSync?: boolean } = {}): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor run')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    await this.runCapacitorRunHook('capacitor:run:before', inputs, options, { ...this.env, project: this.project });
    await this.runCapacitor(['run', platform, ...(shouldSync ? [] : ['--no-sync']), '--target', String(options['target'])]);
  }

  protected async runCapacitorRunHook(name: CapacitorRunHookName, inputs: CommandLineInputs, options: CommandLineOptions, e: HookDeps): Promise<void> {
    const hook = new CapacitorRunHook(name, e);
    let serveOptions: AnyServeOptions | undefined;
    let buildOptions: AnyBuildOptions | undefined;

    if (options['livereload']) {
      const serveRunner = await e.project.requireServeRunner();

      serveOptions = serveRunner.createOptionsFromCommandLine(inputs, options);
    } else {
      const buildRunner = await e.project.requireBuildRunner();

      buildOptions = buildRunner.createOptionsFromCommandLine(inputs, options);
    }

    try {
      await hook.run({
        name: hook.name,
        serve: serveOptions,
        build: buildOptions,
        capacitor: await this.createOptionsFromCommandLine(inputs, options),
      });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }
}

class CapacitorRunHook extends Hook {
  readonly name: CapacitorRunHookName;

  constructor(name: CapacitorRunHookName, e: HookDeps) {
    super(e);

    this.name = name;
  }
}
