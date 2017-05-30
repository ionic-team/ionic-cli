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
  longDescription: `
Authenticate with Ionic servers and retrieve a user token, which is stored in the CLI config.

Alternatively, set the ${chalk.green('IONIC_EMAIL')} and ${chalk.green('IONIC_PASSWORD')} environment variables, and the CLI will automatically authenticate you.

If you need to create an Ionic account, use ${chalk.green('ionic signup')}.
  `,
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
    const config = await this.env.config.load();

    if (await this.env.session.isLoggedIn()) {
      const extra = !inputs[0] || !inputs[1] ? 'Prompting for new credentials.' : 'Attempting login.';
      this.env.log.warn(`You are already logged in${config.user.email ? ' as ' + chalk.bold(config.user.email) : ''}! ${config.cliFlags.interactive ? extra : ''}`);
    } else {
      this.env.log.msg(`Log into your Ionic account\n` +
                       `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);
    }

    // TODO: combine with promptToLogin ?

    if (!inputs[0]) {
      const email = await this.env.prompt({
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: v => validators.email(v),
      });

      inputs[0] = email;
    }

    if (!inputs[1]) {
      const password = await this.env.prompt({
        type: 'password',
        name: 'password',
        message: 'Password:',
      });

      inputs[1] = password;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ email, password ] = inputs;

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
