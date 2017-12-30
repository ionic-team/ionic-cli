import * as path from 'path';

import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework';
import { fsMkdirp, fsUnlink, pathExists } from '@ionic/cli-framework/utils/fs';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, OptionGroup } from '@ionic/cli-utils';

import { SSHBaseCommand } from './base';

const SSH_KEY_TYPES = ['ecdsa', 'ed25519', 'rsa'];

export class SSHGenerateCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'generate',
      type: 'global',
      backends: [BACKEND_PRO],
      description: 'Generates a private and public SSH key pair',
      inputs: [
        {
          name: 'key-path',
          description: 'Destination of private key file',
        },
      ],
      options: [
        {
          name: 'type',
          description: `The type of key to generate: ${SSH_KEY_TYPES.map(v => chalk.green(v)).join(', ')}`,
          default: 'rsa',
          aliases: ['t'],
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'bits',
          description: 'Number of bits in the key',
          aliases: ['b'],
          default: '2048',
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'annotation',
          description: 'Annotation (comment) in public key. Your Ionic email address will be used',
          aliases: ['C'],
          groups: [OptionGroup.Advanced],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForOpenSSH();

    const config = await this.env.config.load();
    await this.env.session.getUserToken();

    if (!options['annotation']) {
      options['annotation'] = config.user.email;
    }

    validate(String(options['type']), 'type', [contains(SSH_KEY_TYPES, { caseSensitive: false })]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getGeneratedPrivateKeyPath } = await import('@ionic/cli-utils/lib/ssh');

    const { bits, annotation } = options;

    const keyPath = inputs[0] ? path.resolve(String(inputs[0])) : await getGeneratedPrivateKeyPath(this.env);
    const keyPathDir = path.dirname(keyPath);
    const pubkeyPath = `${keyPath}.pub`;

    if (!(await pathExists(keyPathDir))) {
      await fsMkdirp(keyPathDir, 0o700);
      this.env.log.msg(`Created ${chalk.bold(prettyPath(keyPathDir))} directory for you.\n`);
    }

    if (await pathExists(keyPath)) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Key ${chalk.bold(prettyPath(keyPath))} exists. Overwrite?`,
      });

      if (confirm) {
        await fsUnlink(keyPath);
      } else {
        this.env.log.msg(`Not overwriting ${chalk.bold(prettyPath(keyPath))}.`);
        return;
      }
    }

    this.env.log.info(
      'Enter a passphrase for your private key.\n' +
      `You will be prompted to provide a ${chalk.bold('passphrase')}, which is used to protect your private key should you lose it. (If someone has your private key, they can impersonate you!) Passphrases are recommended, but not required.\n`
    );

    await this.env.close();
    const shellOptions = { stdio: 'inherit', showCommand: false, showExecution: false, showError: false };
    await this.env.shell.run('ssh-keygen', ['-q', '-t', String(options['type']), '-b', String(bits), '-C', String(annotation), '-f', keyPath], shellOptions);
    await this.env.open();

    this.env.log.nl();

    this.env.log.ok(
      'A new pair of SSH keys has been generated!\n' +
      `Private Key (${chalk.bold(prettyPath(keyPath))}): Keep this safe!\n` +
      `Public Key (${chalk.bold(prettyPath(pubkeyPath))}): Give this to all your friends!\n`
    );

    this.env.log.msg(
      `${chalk.bold('Next steps:')}\n` +
      ` * Add your public key to Ionic: ${chalk.green('ionic ssh add ' + prettyPath(pubkeyPath))}\n` +
      ` * Use your private key for secure communication with Ionic: ${chalk.green('ionic ssh use ' + prettyPath(keyPath))}`
    );
  }
}
