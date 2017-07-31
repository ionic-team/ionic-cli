import * as chalk from 'chalk';

import {
  BACKEND_PRO,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  columnar,
  createFatalAPIFormat,
  isSSHKeyListResponse,
} from '@ionic/cli-utils';

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
    const {
      findSSHConfigHostSection,
      getSSHConfigPath,
      isSSHConfigDirective,
      loadSSHConfig,
    } = await import('../../lib/ssh-config');

    const token = await this.env.session.getUserToken();
    const config = await this.env.config.load();

    let activeFingerprint: string | undefined;
    let foundActiveKey = false;

    const sshConfigPath = getSSHConfigPath();
    const conf = await loadSSHConfig(sshConfigPath);
    const section = findSSHConfigHostSection(conf, config.git.host);

    if (section) {
      const [ identityFile ] = section.config.filter((line) => { // TODO: can't use find() w/o Host or Match, ssh-config bug?
        return isSSHConfigDirective(line) && line.param === 'IdentityFile';
      });

      if (isSSHConfigDirective(identityFile)) {
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
