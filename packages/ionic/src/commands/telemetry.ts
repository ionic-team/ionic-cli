import { CommandGroup } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { input } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';

export class TelemetryCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'telemetry',
      type: 'global',
      summary: 'Opt in and out of telemetry',
      groups: [CommandGroup.Hidden],
      inputs: [
        {
          name: 'status',
          summary: `${input('on')} or ${input('off')}`,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    throw new FatalException(
      `${input('ionic telemetry')} has been removed.\n` +
      `Please use ${input('ionic config')} directly. Examples:\n\n` +
      `    ${input('ionic config get -g telemetry')}\n` +
      `    ${input('ionic config set -g telemetry true')}\n` +
      `    ${input('ionic config set -g telemetry false')}`
    );
  }
}
