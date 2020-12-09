import { validators } from '@ionic/cli-framework';
import * as semver from 'semver';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { pkgManagerArgs } from '../../lib/utils/npm';

import { CapacitorCommand } from './base';

export class AddCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'add',
      type: 'project',
      summary: 'Add a native platform to your Ionic project',
      description: `
${input('ionic capacitor add')} will do the following:
- Install the Capacitor platform package
- Copy the native platform template into your project
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to add (e.g. ${['android', 'ios', 'electron'].map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to add?',
        choices: ['android', 'ios', 'electron'],
      });

      inputs[0] = platform.trim();
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;
    const version = await this.getCapacitorVersion();

    const installedPlatforms = await this.getInstalledPlatforms();

    if (installedPlatforms.includes(platform)) {
      throw new FatalException(`The ${input(platform)} platform is already installed!`);
    }

    if (semver.gte(version, '3.0.0-alpha.1')) {
      const [ manager, ...managerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: `@capacitor/${platform}`, saveDev: true });
      await this.env.shell.run(manager, managerArgs, { cwd: this.integration.root });
    }

    const args = ['add', platform];
    await this.runCapacitor(args);
  }
}
