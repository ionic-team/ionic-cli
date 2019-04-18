import { prettyPath } from '@ionic/cli-framework/utils/format';
import { pathExists } from '@ionic/utils-fs';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input, strong } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

import { SSHBaseCommand } from './base';

export class SSHSetupCommand extends SSHBaseCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'setup',
      type: 'global',
      summary: 'Setup your Ionic Appflow SSH keys automatically',
      description: `
This command offers a setup wizard for Ionic Appflow SSH keys using a series of prompts. For more control, see the commands available for managing SSH keys with the ${input('ionic ssh --help')} command. For an entirely manual approach, see ${strong('Personal Settings')} => ${strong('SSH Keys')} in the Dashboard[^dashboard-settings-ssh-keys].

If you are having issues setting up SSH keys, please get in touch with our Support[^support-request].
      `,
      footnotes: [
        {
          id: 'dashboard-settings-ssh-keys',
          url: `${dashUrl}/settings/ssh-keys`,
        },
        {
          id: 'support-request',
          url: 'https://ion.link/support-request',
        },
      ],
    };
  }

  async preRun() {
    await this.checkForOpenSSH();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { getGeneratedPrivateKeyPath } = await import('../../lib/ssh');
    const { getConfigPath } = await import('../../lib/ssh-config');
    const { promptToLogin } = await import('../../lib/session');

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
      message: `How would you like to connect to Ionic Appflow?`,
      choices: [
        {
          name: 'Automatically setup new a SSH key pair for Ionic Appflow',
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
          `3) Modify your SSH config (${strong(prettyPath(sshconfigPath))}) to use the generated SSH private key for our server(s).`
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
          `Using your previously generated key: ${strong(prettyPath(keyPath))}.\n` +
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
      this.env.log.warn(`Skipping for now. You can configure your SSH settings using ${input('ionic ssh setup')}.`);
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
