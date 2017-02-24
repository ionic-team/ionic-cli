import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  validators
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'telemetry',
  unlisted: true,
  description: 'Opt in and out of telemetry',
  inputs: [
    {
      name: 'opt-in',
      description: `opt-in or opt-out`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        message: 'Would you like to help Ionic improve the CLI by providing anonymous ' +
          'usage and error reporting information?',
        choices: [
          {
            name: 'Yes',
            value: 'yes'
          },
          {
            name: 'No',
            value: 'no'
          }
        ]
      }
    }
  ]
})
export class TelemetryCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const configContents = await this.env.config.load();
    const optIn = inputs[0] === 'yes';
    configContents.cliFlags.enableTelemetry = optIn;
  }
}
