import * as path from 'path';
import * as os from 'os';

import * as sshConfigType from 'ssh-config';

import {
  fileToString,
  indent,
} from '@ionic/cli-utils';

import { load } from './modules';

export function isSSHConfigDirective(entry: sshConfigType.Config): entry is sshConfigType.ConfigDirective {
  const SSHConfig = load('ssh-config');
  return entry && entry.type === SSHConfig.DIRECTIVE;
}

export function getSSHConfigPath() {
  return path.resolve(os.homedir(), '.ssh', 'config');
}

export async function loadSSHConfig(p: string): Promise<sshConfigType.SSHConfig> {
  const SSHConfig = load('ssh-config');
  const s = await fileToString(p);
  return SSHConfig.parse(s);
}

export function findSSHConfigHostSection(conf: sshConfigType.SSHConfig, host: string): sshConfigType.ConfigDirective | null {
  return conf.find({ Host: host });
}

export function ensureSSHConfigHostAndKeyPath(conf: sshConfigType.SSHConfig, conn: { host: string, port?: number }, keyPath: string): void {
  const section = ensureSSHConfigSection(conf, conn.host, conf ? true : false);

  ensureSSHConfigSectionLine(section, 'IdentityFile', keyPath);

  if (typeof conn.port === 'number') {
    ensureSSHConfigSectionLine(section, 'Port', String(conn.port));
  }
}

export function ensureSSHConfigSection(conf: sshConfigType.SSHConfig, host: string, newline: boolean): sshConfigType.ConfigDirective {
  const SSHConfig = load('ssh-config');
  const section = findSSHConfigHostSection(conf, host);

  if (!section) {
    conf.push(SSHConfig.parse(`${newline ? '\n' : ''}Host ${host}\n`)[0]);
  }

  return conf.find({ Host: host });
}

export function ensureSSHConfigSectionLine(section: sshConfigType.ConfigDirective, key: string, value: string): void {
  const SSHConfig = load('ssh-config');
  const found = section.config.some((line) => {
    if (isSSHConfigDirective(line)) {
      if (line.param === key) {
        line.value = value;
        return true;
      }
    }

    return false;
  });

  if (!found) {
    section.config = section.config.concat(SSHConfig.parse(`${indent(4)}${key} ${value}\n`));
  }
}
