import chalk from 'chalk';

import { contains } from '@ionic/cli-framework/lib';
import { CommandData, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class TelemetryCommand extends Command implements CommandPreRun {
  metadata: CommandData = {
    name: 'telemetry',
    type: 'global',
    description: 'Opt in and out of telemetry',
    deprecated: true,
    inputs: [
      {
        name: 'status',
        description: `${chalk.green('on')} or ${chalk.green('off')}`,
        validators: [contains(['on', 'off', undefined], { caseSensitive: false })],
      }
    ],
  };

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.warn(
      `${chalk.green('ionic telemetry')} is deprecated. Please use ${chalk.green('ionic config')} directly. Examples:\n` +
      `    ${chalk.green('ionic config get -g telemetry')}\n` +
      `    ${chalk.green('ionic config set -g telemetry true')}\n` +
      `    ${chalk.green('ionic config set -g telemetry false')}`
    );
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const config = await this.env.config.load();
    const [ status ] = inputs;
    const enableTelemetry = config.telemetry;

    if (typeof status === 'string') {
      config.telemetry = status.toLowerCase() === 'on';
    }

    if (typeof status === 'string' || enableTelemetry !== config.telemetry) {
      this.env.log.ok(`Telemetry: ${chalk.bold(config.telemetry ? 'ON' : 'OFF')}`);
    } else {
      this.env.log.msg(`Telemetry: ${chalk.bold(config.telemetry ? 'ON' : 'OFF')}`);
    }

    if (config.telemetry) {
      this.env.log.msg('Thank you for making the CLI better! ❤️');
    }
  }
}
