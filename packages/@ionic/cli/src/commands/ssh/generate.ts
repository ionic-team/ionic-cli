import { MetadataGroup, contains, validate } from '@ionic/cli-framework';
import { expandPath, prettyPath } from '@ionic/cli-framework/utils/format';
import { mkdirp, pathExists, unlink } from '@ionic/utils-fs';
import * as path from 'path';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input, strong } from '../../lib/color';

import { SSHBaseCommand } from './base';

const SSH_KEY_TYPES = ['ecdsa', 'ed25519', 'rsa'];

export class SSHGenerateCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'generate',
      type: 'global',
      summary: 'Generates a private and public SSH key pair',
      inputs: [
        {
          name: 'key-path',
          summary: 'Destination of private key file',
        },
      ],
      options: [
        {
          name: 'type',
          summary: `The type of key to generate: ${SSH_KEY_TYPES.map(v => input(v)).join(', ')}`,
          default: 'rsa',
          aliases: ['t'],
          groups: [MetadataGroup.ADVANCED],
        },
        {
          name: 'bits',
          summary: 'Number of bits in the key',
          aliases: ['b'],
          default: '2048',
          groups: [MetadataGroup.ADVANCED],
        },
        {
          name: 'annotation',
          summary: 'Annotation (comment) in public key. Your Ionic email address will be used',
          aliases: ['C'],
          groups: [MetadataGroup.ADVANCED],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForOpenSSH();

    await this.env.session.getUserToken();

    if (!options['annotation']) {
      options['annotation'] = this.env.config.get('user.email');
    }

    validate(String(options['type']), 'type', [contains(SSH_KEY_TYPES, { caseSensitive: false })]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getGeneratedPrivateKeyPath } = await import('../../lib/ssh');

    const { bits, annotation } = options;

    const keyPath = inputs[0] ? expandPath(String(inputs[0])) : await getGeneratedPrivateKeyPath(this.env.config.get('user.id'));
    const keyPathDir = path.dirname(keyPath);
    const pubkeyPath = `${keyPath}.pub`;

    if (!(await pathExists(keyPathDir))) {
      await mkdirp(keyPathDir, 0o700 as any); // tslint:disable-line
      this.env.log.msg(`Created ${strong(prettyPath(keyPathDir))} directory for you.`);
    }

    if (await pathExists(keyPath)) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Key ${strong(prettyPath(keyPath))} exists. Overwrite?`,
      });

      if (confirm) {
        await unlink(keyPath);
      } else {
        this.env.log.msg(`Not overwriting ${strong(prettyPath(keyPath))}.`);
        return;
      }
    }

    this.env.log.info(
      'Enter a passphrase for your private key.\n' +
      `You will be prompted to provide a ${strong('passphrase')}, which is used to protect your private key should you lose it. (If someone has your private key, they can impersonate you!) Passphrases are recommended, but not required.\n`
    );

    await this.env.shell.run(
      'ssh-keygen',
      ['-q', '-t', String(options['type']), '-b', String(bits), '-C', String(annotation), '-f', keyPath],
      { stdio: 'inherit', showCommand: false, showError: false }
    );

    this.env.log.nl();

    this.env.log.rawmsg(
      `Private Key (${strong(prettyPath(keyPath))}): Keep this safe!\n` +
      `Public Key (${strong(prettyPath(pubkeyPath))}): Give this to all your friends!\n\n`
    );

    this.env.log.ok('A new pair of SSH keys has been generated!');
    this.env.log.nl();

    this.env.log.msg(
      `${strong('Next steps:')}\n` +
      ` * Add your public key to Ionic: ${input('ionic ssh add ' + prettyPath(pubkeyPath))}\n` +
      ` * Use your private key for secure communication with Ionic: ${input('ionic ssh use ' + prettyPath(keyPath))}`
    );
  }
}
