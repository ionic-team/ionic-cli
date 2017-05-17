import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  CommandPreRun,
  validators,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'login',
  type: 'global',
  description: 'Login with your Ionic ID',
  exampleCommands: ['', 'john@example.com', 'hello@example.com secret'],
  inputs: [
    {
      name: 'email',
      description: 'Your email address',
      validators: [validators.email],
      private: true,
    },
    {
      name: 'password',
      description: 'Your password',
      private: true,
    }
  ]
})
export class LoginCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    if (await this.env.session.isLoggedIn()) {
      this.env.log.warn(`You are already logged in! ${!inputs[0] || !inputs[1] ? 'Prompting for new credentials.' : 'Attempting login.'}`);
    } else {
      this.env.log.msg(`Log into your Ionic account\n` +
                       `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);
    }

    if (!inputs[0]) {
      const response = await this.env.prompt({
        name: 'email',
        message: 'Email:',
        validate: v => validators.email(v),
      });

      inputs[0] = response['email'];
    }

    if (!inputs[1]) {
      const response = await this.env.prompt({
        type: 'password',
        name: 'password',
        message: 'Password:',
      });

      inputs[1] = response['password'];
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
