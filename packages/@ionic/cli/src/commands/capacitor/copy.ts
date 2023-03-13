import { CommandMetadataOption } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';

import { CapacitorCommand } from './base';
import * as semver from "semver";

export class CopyCommand extends CapacitorCommand implements CommandPreRun {
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
        summary: 'Use inline source maps (only available on capacitor 4.2.0+)',
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
      name: 'copy',
      type: 'project',
      summary: 'Copy web assets to native platforms',
      description: `
${input('ionic capacitor copy')} will do the following:
- Perform an Ionic build, which compiles web assets
- Copy web assets to Capacitor native platform(s)
      `,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to copy (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
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
    const [ platform ] = inputs;

    if (options.build) {
      await this.runBuild(inputs, options);
    }

    const args = ['copy'];

    const capVersion = await this.getCapacitorVersion();
    if(semver.gte(capVersion, "4.2.0") && options.inline) {
      args.push("--inline")
    }

    if (platform) {
      args.push(platform);
    }

    await this.runCapacitor(args);
  }
}
