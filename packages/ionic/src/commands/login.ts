import { OptionGroup, validators } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../definitions';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { runCommand } from '../lib/executor';
import { generateUUID } from '../lib/utils/uuid';

export class LoginCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'login',
      type: 'global',
      summary: 'Login to Ionic Pro',
      description: `
Authenticate with Ionic Pro and retrieve a user token, which is stored in the CLI config.

If the ${chalk.green('IONIC_TOKEN')} environment variable is set, the CLI will automatically authenticate you. To retrieve your user token, first use ${chalk.green('ionic login')}, then print the token by running the ${chalk.green('ionic config get -g tokens.user')} command.

You can also use ${chalk.green('IONIC_EMAIL')} and ${chalk.green('IONIC_PASSWORD')} environment variables for automatic authentication, but it is not recommended to store your password in plain text.

If you need to create an Ionic Pro account, use ${chalk.green('ionic signup')}.

If you are having issues logging in, please get in touch with our Support${chalk.cyan('[1]')}.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/support/request')}
      `,
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

    if (this.env.session.isLoggedIn()) {
      const extra = !inputs[0] || !inputs[1] ? 'Prompting for new credentials.' : 'Attempting login.';
      const email = this.env.config.get('user.email');
      this.env.log.warn(`You are already logged in${email ? ' as ' + chalk.bold(email) : ''}! ${this.env.flags.interactive ? extra : ''}`);
    } else {
      this.env.log.msg(
        `Log into your Ionic Pro account\n` +
        `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`
      );
    }

    // TODO: combine with promptToLogin ?

    if (!inputs[0]) {
      const email = await this.env.prompt({
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: v => validators.required(v) && validators.email(v),
      });

      inputs[0] = email;
    }

    if (!sso && !inputs[1]) {
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

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const [ email, password ] = inputs;
    const sso = !!options['sso'];

    if (this.env.session.isLoggedIn()) {
      this.env.log.msg('Logging you out.');
      await runCommand(runinfo, ['logout']);
      this.env.config.set('tokens.telemetry', generateUUID());
    }

    if (sso) {
      await this.env.session.ssoLogin(email);
    } else {
      await this.env.session.login(email, password);
    }

    this.env.log.ok('You are logged in!');
  }
}
