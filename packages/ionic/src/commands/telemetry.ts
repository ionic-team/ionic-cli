import chalk from 'chalk';

import { CommandGroup, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

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
      `${chalk.green('ionic telemetry')} has been removed as of CLI 4.0.\n` +
      `Please use ${chalk.green('ionic config')} directly. Examples:\n\n` +
      `    ${chalk.green('ionic config get -g telemetry')}\n` +
      `    ${chalk.green('ionic config set -g telemetry true')}\n` +
      `    ${chalk.green('ionic config set -g telemetry false')}`
    );
  }
}
