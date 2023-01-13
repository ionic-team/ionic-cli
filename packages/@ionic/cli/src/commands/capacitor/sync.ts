import { BaseError, CommandMetadataOption } from '@ionic/cli-framework';

import { CapacitorSyncHookName, CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { Hook, HookDeps } from '../../lib/hooks';

import { CapacitorCommand } from './base';
import * as semver from 'semver';

export class SyncCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      {
        name: 'build',
        summary: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
      {
        name: 'inline',
        summary: 'Use inline source maps  (only available on capacitor 4.1.0+)',
        type: Boolean,
        default: false
      }
    ];

    const runner = this.project && await this.project.getBuildRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
    }

    return {
      name: 'sync',
      type: 'project',
      summary: 'Sync (copy + update) an Ionic project',
      description: `
${input('ionic capacitor sync')} will do the following:
- Perform an Ionic build, which compiles web assets
- Copy web assets to Capacitor native platform(s)
- Update Capacitor native platform(s) and dependencies
- Install any discovered Capacitor or Cordova plugins
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to sync (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (inputs[0]) {
      await this.checkForPlatformInstallation(inputs[0]);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor sync')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    if (options.build) {
      await this.runBuild(inputs, options);
    }

    const args = ['sync'];

    const capVersion = await this.getCapacitorVersion();
    if(semver.gte(capVersion, "4.1.0") && options.inline) {
      args.push("--inline")
    }

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);

    const hookDeps: HookDeps = {
      config: this.env.config,
      project: this.project,
      shell: this.env.shell,
    };

    await this.runCapacitorSyncHook('capacitor:sync:after', inputs, options, hookDeps);
  }

  private async runCapacitorSyncHook(name: CapacitorSyncHookName, inputs: CommandLineInputs, options: CommandLineOptions, e: HookDeps): Promise<void> {
    const hook = new CapacitorSyncHook(name, e);
    const buildRunner = await e.project.requireBuildRunner();

    try {
      await hook.run({
        name: hook.name,
        build: buildRunner.createOptionsFromCommandLine(inputs, options),
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

class CapacitorSyncHook extends Hook {
  readonly name: CapacitorSyncHookName;

  constructor(name: CapacitorSyncHookName, e: HookDeps) {
    super(e);

    this.name = name;
  }
}
