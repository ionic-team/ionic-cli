import { columnar } from '@ionic/cli-framework/utils/format';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input, strong } from '../../lib/color';

import { SSHBaseCommand } from './base';

export class SSHListCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'global',
      summary: 'List your SSH public keys on Ionic',
      options: [
        {
          name: 'json',
          summary: 'Output SSH keys in JSON',
          type: Boolean,
        },
      ],
    };
  }

  async preRun() {
    await this.checkForOpenSSH();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { SSHKeyClient } = await import('../../lib/ssh');
    const { findHostSection, getConfigPath, isDirective, loadFromPath } = await import('../../lib/ssh-config');

    const { json } = options;

    const user = this.env.session.getUser();
    const token = await this.env.session.getUserToken();

    const sshkeyClient = new SSHKeyClient({ client: this.env.client, user, token });
    const paginator = sshkeyClient.paginate();

    const [ r ] = paginator;
    const res = await r;

    if (json) {
      process.stdout.write(JSON.stringify(res.data));
    } else {
      let activeFingerprint: string | undefined;
      let foundActiveKey = false;

      const sshConfigPath = getConfigPath();
      const conf = await loadFromPath(sshConfigPath);
      const section = findHostSection(conf, this.env.config.getGitHost());

      if (section && section.config) {
        const [ identityFile ] = section.config.filter(line => {
          return isDirective(line) && line.param === 'IdentityFile';
        });

        if (isDirective(identityFile)) {
          const output = await this.env.shell.output('ssh-keygen', ['-E', 'sha256', '-lf', identityFile.value], { fatalOnError: false });
          activeFingerprint = output.trim().split(' ')[1];
        }
      }

      if (res.data.length === 0) {
        this.env.log.warn(`No SSH keys found. Use ${input('ionic ssh add')} to add keys to Ionic.`);
        return;
      }

      const keysMatrix = res.data.map(sshkey => {
        const data = [sshkey.fingerprint, sshkey.name, sshkey.annotation];

        if (sshkey.fingerprint === activeFingerprint) {
          foundActiveKey = true;
          return data.map(v => strong(v));
        }

        return data;
      });

      const table = columnar(keysMatrix, {
        headers: ['fingerprint', 'name', 'annotation'],
      });

      if (foundActiveKey) {
        this.env.log.nl();
        this.env.log.msg(`The row in ${strong('bold')} is the key that this computer is using. To change, use ${input('ionic ssh use')}.`);
      }

      this.env.log.nl();
      this.env.log.rawmsg(table);
      this.env.log.nl();
      this.env.log.ok(`Showing ${strong(String(res.data.length))} SSH key${res.data.length === 1 ? '' : 's'}.`);
      this.env.log.nl();
    }
  }
}
