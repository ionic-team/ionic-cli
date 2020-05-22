import { MetadataGroup, combine, validators } from '@ionic/cli-framework';
import * as chalk from 'chalk';
import * as readline from 'readline';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../definitions';
import { input, strong, success } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { generateUUID } from '../lib/utils/uuid';

export class LoginCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'login',
      type: 'global',
      summary: 'Log in to Ionic',
      description: `
Authenticate with Ionic and retrieve a user token, which is stored in the CLI config. The most secure way to log in is running ${input('ionic login')} without arguments, which will open a browser where you can submit your credentials.

If the ${input('IONIC_TOKEN')} environment variable is set, the CLI will automatically authenticate you.
To retrieve your user token, first use ${input('ionic login <email> <password>')}, then print the token by running the ${input('ionic config get -g tokens.user')} command.
If you logged in using the more secure ${input('ionic login')}, if you retrieve your token using ${input('ionic config get -g tokens.user')} you will get a short lived token.

${input('ionic login')} will also accept ${input('password')} through stdin, e.g.: ${input('echo "<password>" | ionic login <email>')}.

If you need to create an Ionic account, use ${input('ionic signup')} or the Ionic Website[^signup].

You can reset your password in the Dashboard[^reset-password].

If you are having issues logging in, please get in touch with our Support[^support-request].
      `,
      footnotes: [
        {
          id: 'signup',
          url: 'https://ionicframework.com/signup',
        },
        {
          id: 'reset-password',
          url: 'https://dashboard.ionicframework.com/reset-password',
          shortUrl: 'https://ion.link/reset-password',
        },
        {
          id: 'support-request',
          url: 'https://ion.link/support-request',
        },
      ],
      exampleCommands: ['', 'john@example.com', 'hello@example.com secret'],
      inputs: [
        {
          name: 'email',
          summary: '[Optional] Your email address',
          private: true,
        },
        {
          name: 'password',
          summary: '[Optional] Your password',
          private: true,
        },
      ],
      options: [
        {
          name: 'sso',
          type: Boolean,
          summary: 'Open a window to log in with the SSO provider associated with your email',
          groups: [MetadataGroup.HIDDEN, MetadataGroup.DEPRECATED],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const sso = !!options['sso'];

    if (options['email'] || options['password']) {
      throw new FatalException(
        `${input('email')} and ${input('password')} are command arguments, not options. Please try this:\n` +
        `${input('ionic login <email> <password>')}\n`
      );
    }

    // ask for password only if the user specifies an email
    const validateEmail = !!inputs[0];
    const askForPassword = !sso && inputs[0] && !inputs[1];

    if (this.env.session.isLoggedIn()) {
      const email = this.env.config.get('user.email');

      const extra = askForPassword
        ? (this.env.flags.interactive ? `Prompting for new credentials.\n\nUse ${chalk.yellow('Ctrl+C')} to cancel and remain logged in.` : '')
        : 'You will be logged out beforehand.';

      if (this.env.flags.interactive) {
        this.env.log.warn(
          'You will be logged out.\n' +
          `You are already logged in${email ? ' as ' + strong(email) : ''}! ${extra}`
        );

        this.env.log.nl();
      }
    } else {
      if (this.env.flags.interactive) {
        this.env.log.info(
          `Log into your Ionic account!\n` +
          `If you don't have one yet, create yours by running: ${input(`ionic signup`)}`
        );

        this.env.log.nl();
      }
    }

    // TODO: combine with promptToLogin ?
    if (validateEmail) {
      const validatedEmail = validators.email(inputs[0]);
      if (validatedEmail !== true) {
        this.env.log.warn(`${validatedEmail}. \n Please enter a valid email address.`);
        if (this.env.flags.interactive) {
          const email = await this.env.prompt({
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: v => combine(validators.required, validators.email)(v),
          });
          inputs[0] = email;
        } else {
          throw new FatalException('Invalid email');
        }
      }
    }
    if (askForPassword) {
      if (this.env.flags.interactive) {
        const password = await this.env.prompt({
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: v => validators.required(v),
        });

        inputs[1] = password;
      } else {
        inputs[1] = await this.getPasswordFromStdin();
      }
    }
  }

  getPasswordFromStdin(): Promise<string> {
    return new Promise<string>(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        terminal: false,
      });

      rl.on('line', line => {
        resolve(line);
        rl.close();
      });
    });
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ email, password ] = inputs;
    const sso = !!options['sso'];

    if (this.env.session.isLoggedIn()) {
      await this.env.session.logout();
      this.env.config.set('tokens.telemetry', generateUUID());
    }

    if (email && password) {
      await this.env.session.login(email, password);
    } else if (sso) {
      this.env.log.info(
        `Ionic SSO Login (DEPRECATED)\n` +
        `Please run ${input('ionic login')} instead.\n` +
        `During this process, a browser window will open to authenticate you with the identity provider. Please leave this process running until authentication is complete.`
      );
      this.env.log.nl();

      await this.env.session.ssoLogin(email);
    } else {
      this.env.log.info(
        `Ionic Login\n` +
        `During this process, a browser window will open to authenticate you. Please leave this process running until authentication is complete.`
      );
      this.env.log.nl();

      await this.env.session.webLogin();
    }

    this.env.log.ok(success(strong('You are logged in!')));
  }
}
