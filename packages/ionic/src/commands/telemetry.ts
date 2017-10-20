import chalk from 'chalk';

import { contains } from '@ionic/cli-framework/lib';
import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'telemetry',
  type: 'global',
  description: 'Opt in and out of telemetry',
  inputs: [
    {
      name: 'status',
      description: `${chalk.green('on')} or ${chalk.green('off')}`,
      validators: [contains(['on', 'off'], { caseSensitive: false })],
      required: false,
    }
  ],
})
export class TelemetryCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
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
