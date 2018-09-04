import chalk from 'chalk';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { runCommand } from '@ionic/cli-utils/lib/executor';
import { pathExists } from '@ionic/utils-fs';

import { SSHBaseCommand } from './base';

export class SSHSetupCommand extends SSHBaseCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'setup',
      type: 'global',
      summary: 'Setup your Ionic Pro SSH keys automatically',
      description: `
This command offers a setup wizard for Ionic Pro SSH keys using a series of prompts. For more control, see the commands available for managing SSH keys with the ${chalk.green('ionic ssh --help')} command. For an entirely manual approach, see ${chalk.bold('Personal Settings')} => ${chalk.bold('SSH Keys')} in the Dashboard${chalk.cyan('[1]')}.

If you are having issues setting up SSH keys, please get in touch with our Support${chalk.cyan('[2]')}.

${chalk.cyan('[1]')}: ${chalk.bold('https://dashboard.ionicframework.com/settings/ssh-keys')}
${chalk.cyan('[2]')}: ${chalk.bold('https://ionicframework.com/support/request')}
      `,
    };
  }

  async preRun() {
    await this.checkForOpenSSH();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { getGeneratedPrivateKeyPath } = await import('@ionic/cli-utils/lib/ssh');
    const { getConfigPath } = await import('@ionic/cli-utils/lib/ssh-config');
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');

    if (!this.env.session.isLoggedIn()) {
      await promptToLogin(this.env);
    }

    const CHOICE_AUTOMATIC = 'automatic';
    const CHOICE_MANUAL = 'manual';
    const CHOICE_SKIP = 'skip';
    const CHOICE_IGNORE = 'ignore';

    if (this.env.config.get('git.setup')) {
      const rerun = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `SSH setup wizard has run before. Would you like to run it again?`,
      });

      if (!rerun) {
        return;
      }
    } else {
      this.env.log.msg(`Looks like you haven't configured your SSH settings yet.`);
    }

    // TODO: link to docs about manual git setup

    const setupChoice = await this.env.prompt({
      type: 'list',
      name: 'setupChoice',
      message: `How would you like to connect to Ionic Pro?`,
      choices: [
        {
          name: 'Automatically setup new a SSH key pair for Ionic Pro',
          value: CHOICE_AUTOMATIC,
        },
        {
          name: 'Use an existing SSH key pair',
          value: CHOICE_MANUAL,
        },
        {
          name: 'Skip for now',
          value: CHOICE_SKIP,
        },
        {
          name: 'Ignore this prompt forever',
          value: CHOICE_IGNORE,
        },
      ],
    });

    if (setupChoice === CHOICE_AUTOMATIC) {
      const sshconfigPath = getConfigPath();
      const keyPath = await getGeneratedPrivateKeyPath(this.env.config.get('user.id'));
      const pubkeyPath = `${keyPath}.pub`;

      const [ pubkeyExists, keyExists ] = await Promise.all([pathExists(keyPath), pathExists(pubkeyPath)]);

      if (!pubkeyExists && !keyExists) {
        this.env.log.info(
          'The automatic SSH setup will do the following:\n' +
          `1) Generate a new SSH key pair with OpenSSH (will not overwrite any existing keys).\n` +
          `2) Upload the generated SSH public key to our server, registering it on your account.\n` +
          `3) Modify your SSH config (${chalk.bold(prettyPath(sshconfigPath))}) to use the generated SSH private key for our server(s).`
        );

        const confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'May we proceed?',
        });

        if (!confirm) {
          throw new FatalException();
        }
      }

      if (pubkeyExists && keyExists) {
        this.env.log.msg(
          `Using your previously generated key: ${chalk.bold(prettyPath(keyPath))}.\n` +
          `You can generate a new one by deleting it.`
        );
      } else {
        await runCommand(runinfo, ['ssh', 'generate', keyPath]);
      }

      await runCommand(runinfo, ['ssh', 'add', pubkeyPath, '--use']);
    } else if (setupChoice === CHOICE_MANUAL) {
      await runCommand(runinfo, ['ssh', 'add']);
    }

    if (setupChoice === CHOICE_SKIP) {
      this.env.log.warn(`Skipping for now. You can configure your SSH settings using ${chalk.green('ionic ssh setup')}.`);
    } else {
      if (setupChoice === CHOICE_IGNORE) {
        this.env.log.ok(`We won't pester you about SSH settings anymore!`);
      } else {
        this.env.log.ok('SSH setup successful!');
      }

      this.env.config.set('git.setup', true);
    }
  }
}
