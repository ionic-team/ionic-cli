import * as path from 'path';
import * as os from 'os';

import * as SSHConfig from 'ssh-config';

import {
  fileToString,
  indent,
} from '@ionic/cli-utils';

export async function loadSSHConfig(p: string): Promise<SSHConfig.SSHConfig> {
  const s = await fileToString(p);
  return SSHConfig.parse(s);
}

export function isSSHConfigDirective(entry: SSHConfig.Config): entry is SSHConfig.ConfigDirective {
  return entry && entry.type === SSHConfig.DIRECTIVE;
}

export function getSSHConfigPath() {
  return path.resolve(os.homedir(), '.ssh', 'config');
}

export function findSSHConfigHostSection(conf: SSHConfig.SSHConfig, host: string): SSHConfig.ConfigDirective | null {
  return conf.find({ Host: host });
}

export function ensureSSHConfigHostAndKeyPath(conf: SSHConfig.SSHConfig, conn: { host: string, port?: number }, keyPath: string): void {
  const section = ensureSSHConfigSection(conf, conn.host, conf ? true : false);

  ensureSSHConfigSectionLine(section, 'IdentityFile', keyPath);

  if (typeof conn.port === 'number') {
    ensureSSHConfigSectionLine(section, 'Port', String(conn.port));
  }
}

export function ensureSSHConfigSection(conf: SSHConfig.SSHConfig, host: string, newline: boolean): SSHConfig.ConfigDirective {
  const section = findSSHConfigHostSection(conf, host);

  if (!section) {
    conf.push(SSHConfig.parse(`${newline ? '\n' : ''}Host ${host}\n`)[0]);
  }

  return conf.find({ Host: host });
}

export function ensureSSHConfigSectionLine(section: SSHConfig.ConfigDirective, key: string, value: string): void {
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
