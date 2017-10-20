import * as path from 'path';

import chalk from 'chalk';

import { contains, validate } from '@ionic/cli-framework/lib';
import { BACKEND_PRO, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { fsMkdirp, fsUnlink, pathExists } from '@ionic/cli-framework/utils/fs';

import { SSHBaseCommand } from './base';

const SSH_KEY_TYPES = ['ecdsa', 'ed25519', 'rsa'];

@CommandMetadata({
  name: 'generate',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'Generates a private and public SSH key pair',
  inputs: [
    {
      name: 'key-path',
      description: 'Destination of private key file',
      required: false,
    },
  ],
  options: [
    {
      name: 'type',
      description: `The type of key to generate: ${SSH_KEY_TYPES.map(v => chalk.green(v)).join(', ')}`,
      default: 'rsa',
      aliases: ['t'],
      advanced: true,
    },
    {
      name: 'bits',
      description: 'Number of bits in the key',
      aliases: ['b'],
      default: '2048',
      advanced: true,
    },
    {
      name: 'annotation',
      description: 'Annotation (comment) in public key. Your Ionic email address will be used',
      aliases: ['C'],
      advanced: true,
    }
  ],
})
export class SSHGenerateCommand extends SSHBaseCommand implements CommandPreRun {
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
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');
    const { getGeneratedPrivateKeyPath } = await import('@ionic/cli-utils/lib/ssh');

    const { bits, annotation } = options;

    const keyPath = inputs[0] ? path.resolve(String(inputs[0])) : await getGeneratedPrivateKeyPath(this.env);
    const keyPathDir = path.dirname(keyPath);
    const pubkeyPath = `${keyPath}.pub`;

    if (!(await pathExists(keyPathDir))) {
      await fsMkdirp(keyPathDir, 0o700);
      this.env.log.info(`Created ${chalk.bold(prettyPath(keyPathDir))} directory for you.\n`);
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
        this.env.log.info(`Not overwriting ${chalk.bold(prettyPath(keyPath))}.`);
        return;
      }
    }

    this.env.log.info(
      `You will be prompted to provide a ${chalk.bold('passphrase')}, which is ` +
      'used to protect your private key should you lose it. (If someone has your ' +
      'private key, they can impersonate you!) Passphrases are recommended, but not required.'
    );

    await this.env.close();
    const shellOptions = { stdio: 'inherit', showCommand: false, showExecution: false, showError: false };
    await this.env.shell.run('ssh-keygen', ['-q', '-t', String(options['type']), '-b', String(bits), '-C', String(annotation), '-f', keyPath], shellOptions);
    await this.env.open();

    this.env.log.ok(
      'A new pair of SSH keys has been generated!\n' +
      `Private Key (${chalk.bold(prettyPath(keyPath))}): Keep this safe!\n` +
      `Public Key (${chalk.bold(prettyPath(pubkeyPath))}): Give this to all your friends!`
    );

    this.env.log.info(
      'Next steps:\n' +
      `- Add your public key to Ionic: ${chalk.green('ionic ssh add ' + prettyPath(pubkeyPath))}\n` +
      `- Use your private key for secure communication with Ionic: ${chalk.green('ionic ssh use ' + prettyPath(keyPath))}`
    );
  }
}
