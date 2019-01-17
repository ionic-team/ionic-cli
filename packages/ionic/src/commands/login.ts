import { OptionGroup, validators } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../definitions';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { generateUUID } from '../lib/utils/uuid';

export class LoginCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'login',
      type: 'global',
      summary: 'Login to Ionic Appflow',
      description: `
Authenticate with Ionic Appflow and retrieve a user token, which is stored in the CLI config.

If the ${chalk.green('IONIC_TOKEN')} environment variable is set, the CLI will automatically authenticate you. To retrieve your user token, first use ${chalk.green('ionic login')}, then print the token by running the ${chalk.green('ionic config get -g tokens.user')} command.

You can also use ${chalk.green('IONIC_EMAIL')} and ${chalk.green('IONIC_PASSWORD')} environment variables for automatic authentication, but it is not recommended to store your password in plain text.

If you need to create an Ionic Appflow account, use ${chalk.green('ionic signup')}.

If you are having issues logging in, please get in touch with our Support[^support-request].
      `,
      footnotes: [
        {
          id: 'support-request',
          url: 'https://ion.link/support-request',
        },
      ],
      exampleCommands: ['', 'john@example.com', 'hello@example.com secret'],
      inputs: [
        {
          name: 'email',
          summary: 'Your email address',
          validators: [validators.required, validators.email],
          private: true,
        },
        {
          name: 'password',
          summary: 'Your password',
          // this is a hack since sso is hidden, no need to make password not required for it
          validators: process.argv.includes('--sso') ? [] : [validators.required],
          private: true,
        },
      ],
      options: [
        {
          name: 'sso',
          type: Boolean,
          summary: 'Open a window to log in with the SSO provider associated with your email',
          groups: [OptionGroup.Hidden],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const sso = !!options['sso'];

    if (options['email'] || options['password']) {
      throw new FatalException(
        `${chalk.green('email')} and ${chalk.green('password')} are command arguments, not options. Please try this:\n` +
        `${chalk.green('ionic login <email> <password>')}\n`
      );
    }

    const askForEmail = !inputs[0];
    const askForPassword = !sso && !inputs[1];

    if (this.env.session.isLoggedIn()) {
      const email = this.env.config.get('user.email');

      const extra = askForEmail || askForPassword
        ? (this.env.flags.interactive ? `Prompting for new credentials.\n\nUse ${chalk.yellow('Ctrl+C')} to cancel and remain logged in.` : '')
        : 'You will be logged out beforehand.';

      this.env.log.warn(
        'You will be logged out.\n' +
        `You are already logged in${email ? ' as ' + chalk.bold(email) : ''}! ${extra}`
      );
      this.env.log.nl();
    } else {
      this.env.log.info(
        `Log into your Ionic Appflow account!\n` +
        `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}`
      );
      this.env.log.nl();
    }

    // TODO: combine with promptToLogin ?

    if (askForEmail) {
      const email = await this.env.prompt({
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: v => validators.required(v) && validators.email(v),
      });

      inputs[0] = email;
    }

    if (askForPassword) {
      const password = await this.env.prompt({
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: v => validators.required(v),
      });

      inputs[1] = password;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ email, password ] = inputs;
    const sso = !!options['sso'];

    if (this.env.session.isLoggedIn()) {
      await this.env.session.logout();
      this.env.config.set('tokens.telemetry', generateUUID());
    }

    if (sso) {
      this.env.log.info(
        `Ionic Appflow SSO Login\n` +
        `During this process, a browser window will open to authenticate you with the identity provider for ${chalk.green(email)}. Please leave this process running until authentication is complete.`
      );
      this.env.log.nl();

      await this.env.session.ssoLogin(email);
    } else {
      await this.env.session.login(email, password);
    }

    this.env.log.ok(chalk.green.bold('You are logged in!'));
  }
}
