import * as chalk from 'chalk';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { isSSHKeyListResponse } from '@ionic/cli-utils/guards';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';

import { SSHBaseCommand } from './base';

@CommandMetadata({
  name: 'list',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'List your SSH public keys on Ionic',
})
export class SSHListCommand extends SSHBaseCommand implements CommandPreRun {
  async preRun() {
    await this.checkForOpenSSH();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { createFatalAPIFormat } = await import('@ionic/cli-utils/lib/http');
    const { columnar } = await import('@ionic/cli-utils/lib/utils/format');

    const {
      findHostSection,
      getConfigPath,
      isDirective,
      loadFromPath,
    } = await import('@ionic/cli-utils/lib/ssh-config');

    const token = await this.env.session.getUserToken();
    const config = await this.env.config.load();

    let activeFingerprint: string | undefined;
    let foundActiveKey = false;

    const sshConfigPath = getConfigPath();
    const conf = await loadFromPath(sshConfigPath);
    const section = findHostSection(conf, config.git.host);

    if (section) {
      const [ identityFile ] = section.config.filter((line) => { // TODO: can't use find() w/o Host or Match, ssh-config bug?
        return isDirective(line) && line.param === 'IdentityFile';
      });

      if (isDirective(identityFile)) {
        const output = await this.env.shell.run('ssh-keygen', ['-E', 'sha256', '-lf', identityFile.value], { showCommand: false, fatalOnError: false });
        activeFingerprint = output.trim().split(' ')[1];
      }
    }

    const req = this.env.client.make('GET', `/users/${config.user.id}/sshkeys`)
      .set('Authorization', `Bearer ${token}`);
    const res = await this.env.client.do(req);

    if (!isSSHKeyListResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    if (res.data.length === 0) {
      this.env.log.warn(`No SSH keys found. Use ${chalk.green('ionic ssh add')} to add keys to Ionic.`);
      return;
    }

    const keysMatrix = res.data.map(sshkey => {
      const data = [sshkey.fingerprint, sshkey.name, sshkey.annotation];

      if (sshkey.fingerprint === activeFingerprint) {
        foundActiveKey = true;
        return data.map(v => chalk.bold(v));
      }

      return data;
    });

    const table = columnar(keysMatrix, {
      columnHeaders: ['fingerprint', 'name', 'annotation'],
    });

    this.env.log.nl();

    if (foundActiveKey) {
      this.env.log.info(`The row in ${chalk.bold('bold')} is the key that this computer is using. To change, use ${chalk.green('ionic ssh use')}.\n`);
    }

    this.env.log.msg(table);
    this.env.log.nl();
    this.env.log.ok(`Showing ${chalk.bold(String(res.data.length))} SSH key${res.data.length === 1 ? '' : 's'}.`);
    this.env.log.nl();
  }
}
