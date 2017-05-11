import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  contains,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'telemetry',
  type: 'global',
  description: 'Opt in and out of telemetry',
  inputs: [
    {
      name: 'status',
      description: `${chalk.green('on')} or ${chalk.green('off')}`,
      validators: [contains([undefined, 'on', 'off'], { caseSensitive: false })],
    }
  ],
})
export class TelemetryCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const config = await this.env.config.load();
    const [status] = inputs;
    const enableTelemetry = config.cliFlags.enableTelemetry;

    if (typeof status === 'string') {
      config.cliFlags.enableTelemetry = status.toLowerCase() === 'on';
    }

    if (typeof status === 'string' || enableTelemetry !== config.cliFlags.enableTelemetry) {
      this.env.log.ok(`Telemetry: ${chalk.bold(config.cliFlags.enableTelemetry ? 'ON' : 'OFF')}`);
    } else {
      this.env.log.msg(`Telemetry: ${chalk.bold(config.cliFlags.enableTelemetry ? 'ON' : 'OFF')}`);
    }

    if (config.cliFlags.enableTelemetry) {
      this.env.log.msg('Thank you for making the CLI better! ❤️');
    }
  }
}
