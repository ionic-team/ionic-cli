import * as os from 'os';
import * as path from 'path';

import { fileToString } from '@ionic/cli-framework/utils/fs';
import * as SSHConfig from 'ssh-config';

export { SSHConfig };

export async function loadFromPath(p: string): Promise<SSHConfig.SSHConfig> {
  const s = await fileToString(p);

  return SSHConfig.parse(s);
}

export function isDirective(entry: any): entry is SSHConfig.ConfigDirective {
  return entry && entry.type === SSHConfig.DIRECTIVE;
}

export function isHostDirective(entry: SSHConfig.Config): entry is SSHConfig.ConfigHostDirective {
  return isDirective(entry) && entry.param === 'Host';
}

export function getConfigPath() {
  return path.resolve(os.homedir(), '.ssh', 'config');
}

export function findHostSection(conf: SSHConfig.SSHConfig, host: string): SSHConfig.ConfigHostDirective | null {
  return conf.find({ Host: host });
}

export function ensureHostAndKeyPath(conf: SSHConfig.SSHConfig, conn: { host: string, port?: number }, keyPath: string): void {
  const section = ensureHostSection(conf, conn.host);
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

    if (isHostDirective(previousSection)) {
      const previousSectionLastEntry = previousSection.config[previousSection.config.length - 1];

      if (previousSectionLastEntry) {
        previousSectionLastEntry.after = '\n';
      }
    } else {
      previousSection.after = '\n';
    }

    section.before = '\n';
  }

  section.after = '\n';

  if (!section.config) {
    section.config = [];
  }

  for (const entry of section.config) {
    entry.before = '    ';
    entry.after = '\n';
  }

  if (index !== conf.length - 1) {
    const lastEntry = section.config[section.config.length - 1];
    lastEntry.after = '\n\n';
  }
}

function ensureHostSection(conf: SSHConfig.SSHConfig, host: string): SSHConfig.ConfigHostDirective {
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

function ensureSectionLine(section: SSHConfig.ConfigHostDirective, key: string, value: string): void {
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
