import * as chalk from 'chalk';
import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata, CommandPreInputsPrompt } from '@ionic/cli-utils';
import { validators } from '@ionic/cli-utils';

@CommandMetadata({
  name: 'login',
  type: 'global',
  description: 'Login with your Ionic ID',
  exampleCommands: ['', 'john@example.com', 'hello@example.com secret'],
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
export class LoginCommand extends Command implements CommandPreInputsPrompt {
  async preInputsPrompt(): Promise<void | number> {
    if (await this.env.session.isLoggedIn()) {
      const response = await this.env.prompt({
        type: 'confirm',
        name: 'login_again',
        message: 'You are already logged in! Do you want to log in to another account?',
      });

      if (!response['login_again']) {
        return 0;
      }
    } else {
      this.env.log.msg(`Log into your Ionic account\n` +
        `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
