import * as chalk from 'chalk';
import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';
import { validators } from '@ionic/cli-utils';

@CommandMetadata({
  name: 'login',
  description: 'Login with your Ionic ID',
  exampleCommands: ['john@example.com'],
  inputs: [
    {
      name: 'email',
      description: 'Your email address',
      prompt: {
        message: 'Email:'
      },
      validators: [validators.required, validators.email],
      private: true
    },
    {
      name: 'password',
      description: 'Your password',
      prompt: {
        type: 'password',
        message: 'Password:'
      },
      validators: [validators.required],
      private: true
    }
  ]
})
export class LoginCommand extends Command {
  async prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg(`Log into your Ionic account\n` +
                     `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;
    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
