import * as path from 'path';
import * as os from 'os';

import * as SSHConfigModule from 'ssh-config';
export const SSHConfig = SSHConfigModule;

import { fileToString } from '@ionic/cli-framework/utils/fs';

export async function loadFromPath(p: string): Promise<SSHConfigModule.SSHConfig> {
  const s = await fileToString(p);

  return SSHConfig.parse(s);
}

export function isDirective(entry: SSHConfigModule.Config): entry is SSHConfigModule.ConfigDirective {
  return entry && entry.type === SSHConfig.DIRECTIVE;
}

export function getConfigPath() {
  return path.resolve(os.homedir(), '.ssh', 'config');
}

export function findHostSection(conf: SSHConfigModule.SSHConfig, host: string): SSHConfigModule.ConfigDirective | null {
  return conf.find({ Host: host });
}

export function ensureHostAndKeyPath(conf: SSHConfigModule.SSHConfig, conn: { host: string, port?: number }, keyPath: string): void {
  const section = ensureSection(conf, conn.host);
  const index = conf.indexOf(section);

  ensureSectionLine(section, 'IdentityFile', keyPath);

  if (typeof conn.port === 'number' && conn.port !== 22) {
    ensureSectionLine(section, 'Port', String(conn.port));
  }

  // massage the section for proper whitespace

  if (index === 0) {
    section.before = '';
  } else {
    const previousSection = conf[index - 1];

    if (isDirective(previousSection)) {
      const previousSectionLastEntry = previousSection.config[previousSection.config.length - 1];
      previousSectionLastEntry.after = '\n';
    } else {
      previousSection.after = '\n';
    }

    section.before = '\n';
  }

  section.after = '\n';

  for (let entry of section.config) {
    entry.before = '    ';
    entry.after = '\n';
  }

  if (index !== conf.length - 1) {
    const lastEntry = section.config[section.config.length - 1];
    lastEntry.after = '\n\n';
  }
}

function ensureSection(conf: SSHConfigModule.SSHConfig, host: string): SSHConfigModule.ConfigDirective {
  let section = findHostSection(conf, host);

  if (!section) {
    conf.push(SSHConfig.parse(`\nHost ${host}\n`)[0]);
    section = findHostSection(conf, host);
  }

  if (!section) {
    throw new Error(`Could not find/insert section for host: ${host}`);
  }

  return section;
}

function ensureSectionLine(section: SSHConfigModule.ConfigDirective, key: string, value: string): void {
  const found = section.config.some(line => {
    if (isDirective(line)) {
      if (line.param === key) {
        line.value = value;
        return true;
      }
    }

    return false;
  });

  if (!found) {
    section.config = section.config.concat(SSHConfig.parse(`${key} ${value}\n`));
  }
}
