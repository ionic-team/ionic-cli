import { CommandGroup } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
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
          summary: `${chalk.green('on')} or ${chalk.green('off')}`,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    throw new FatalException(
      `${chalk.green('ionic telemetry')} has been removed.\n` +
      `Please use ${chalk.green('ionic config')} directly. Examples:\n\n` +
      `    ${chalk.green('ionic config get -g telemetry')}\n` +
      `    ${chalk.green('ionic config set -g telemetry true')}\n` +
      `    ${chalk.green('ionic config set -g telemetry false')}`
    );
  }
}
