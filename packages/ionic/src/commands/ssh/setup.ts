import chalk from 'chalk';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { pathExists } from '@ionic/cli-framework/utils/fs';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { SSHBaseCommand } from './base';

@CommandMetadata({
  name: 'setup',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'Setup your Ionic SSH keys automatically',
})
export class SSHSetupCommand extends SSHBaseCommand {
  async preRun() {
    await this.checkForOpenSSH();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');
    const { getGeneratedPrivateKeyPath } = await import('@ionic/cli-utils/lib/ssh');
    const { getConfigPath } = await import('@ionic/cli-utils/lib/ssh-config');
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');

    const config = await this.env.config.load();

    if (!(await this.env.session.isLoggedIn())) {
      await promptToLogin(this.env);
    }

    const CHOICE_AUTOMATIC = 'automatic';
    const CHOICE_MANUAL = 'manual';
    const CHOICE_SKIP = 'skip';
    const CHOICE_IGNORE = 'ignore';

    if (config.git.setup) {
      const rerun = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `SSH setup wizard has run before. Would you like to run it again?`,
      });

      if (!rerun) {
        return;
      }
    } else {
      this.env.log.info(`Looks like you haven't configured your SSH settings yet.`);
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
      const keyPath = await getGeneratedPrivateKeyPath(this.env);
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
        this.env.log.info(
          `Using your previously generated key: ${chalk.bold(prettyPath(keyPath))}.\n` +
          `You can generate a new one by deleting it.`
        );
      } else {
        await this.env.runCommand(['ssh', 'generate', keyPath]);
      }

      await this.env.runCommand(['ssh', 'add', pubkeyPath, '--use']);
    } else if (setupChoice === CHOICE_MANUAL) {
      await this.env.runCommand(['ssh', 'add']);
    }

    if (setupChoice === CHOICE_SKIP) {
      this.env.log.warn(`Skipping for now. You can configure your SSH settings using ${chalk.green('ionic ssh setup')}.`);
    } else {
      if (setupChoice === CHOICE_IGNORE) {
        this.env.log.ok(`We won't pester you about SSH settings anymore!`);
      } else {
        this.env.log.ok('SSH setup successful!');
      }

      config.git.setup = true;
    }
  }
}
