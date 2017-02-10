import * as chalk from 'chalk';
import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';
import { combine, validators } from '@ionic/cli-utils';

@CommandMetadata({
  name: 'login',
  description: 'Login with your Ionic ID',
  exampleCommands: ['john@example.com'],
  inputs: [
    {
      name: 'email',
      description: 'Your email address'
    },
    {
      name: 'password',
      description: 'Your password'
    }
  ]
})
export class LoginCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    if (!email) {
      this.env.log.msg(`Log into your Ionic account\n` +
        `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);

      const response = await this.env.inquirer.prompt({
        name: 'email',
        type: 'input',
        message: 'Email:',
        validate: combine([validators.required, validators.email])
      });
      email = response['email'];
    }
    if (!password) {
      const response = await this.env.inquirer.prompt({
        name: 'password',
        type: 'password',
        message: 'Password:',
        validate: combine([validators.required])
      });
      email = response['password'];
    }

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
