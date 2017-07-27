import * as path from 'path';

import * as chalk from 'chalk';

import { DaemonFile, DistTag, IonicEnvironment } from '../definitions';
import { BaseConfig } from './config';
import { fsOpen, fsReadFile, fsWriteFile } from './utils/fs';
import { KNOWN_COMMAND_PLUGINS, KNOWN_GLOBAL_PLUGINS, KNOWN_PROJECT_PLUGINS, formatFullPluginName } from './plugins';
import { load } from './modules';

const KNOWN_PACKAGES = [
  ...([] as string[]).concat(KNOWN_COMMAND_PLUGINS, KNOWN_GLOBAL_PLUGINS, KNOWN_PROJECT_PLUGINS).map(formatFullPluginName),
  '@ionic/cli-utils',
  'ionic',
];

export const DAEMON_PID_FILE = 'daemon.pid';
export const DAEMON_JSON_FILE = 'daemon.json';
export const DAEMON_LOG_FILE = 'daemon.log';

export class Daemon extends BaseConfig<DaemonFile> {
  get pidFilePath(): string {
    return path.join(this.directory, DAEMON_PID_FILE);
  }

  get logFilePath(): string {
    return path.join(this.directory, DAEMON_LOG_FILE);
  }

  async getPid(): Promise<number | undefined> {
    try {
      const f = await fsReadFile(this.pidFilePath, { encoding: 'utf8' });
      return Number(f);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  async setPid(pid: number): Promise<void> {
    await fsWriteFile(this.pidFilePath, String(pid), { encoding: 'utf8' });
  }

  async provideDefaults(o: any): Promise<DaemonFile> {
    const lodash = load('lodash');
    const results = lodash.cloneDeep(o);

    if (!results.daemonVersion) {
      results.daemonVersion = '';
    }

    if (!results.latestVersions) {
      results.latestVersions = {};
    }

    if (!results.latestVersions.latest) {
      results.latestVersions.latest = {};
    }

    for (let pkg of KNOWN_PACKAGES) {
      if (typeof results.latestVersions.latest[pkg] === 'undefined') {
        results.latestVersions.latest[pkg] = '';
      }
    }

    return results;
  }

  populateDistTag(distTag: DistTag) {
    if (this.configFile) {
      if (typeof this.configFile.latestVersions[distTag] === 'undefined') {
        this.configFile.latestVersions[distTag] = {};
      }

      for (let pkg of KNOWN_PACKAGES) {
        if (typeof this.configFile.latestVersions[distTag][pkg] === 'undefined') {
          this.configFile.latestVersions[distTag][pkg] = '';
        }
      }
    }
  }

  is(j: any): j is DaemonFile {
    return j
      && typeof j.latestVersions === 'object'
      && typeof j.latestVersions.latest === 'object';
  }
}

export function processRunning(pid: number): boolean {
  try {
    const r = process.kill(pid, 0);

    if (typeof r === 'boolean') {
      return r;
    }

    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export async function checkForDaemon(env: IonicEnvironment): Promise<number> {
  const config = await env.config.load();

  if (!config.daemon.updates) {
    return 0;
  }

  const f = await env.daemon.getPid();

  if (f && processRunning(f)) {
    env.log.debug(() => `Daemon found (pid: ${chalk.bold(String(f))})`);
    return f;
  }

  env.tasks.next('Spinning up daemon');

  const crossSpawn = load('cross-spawn');
  const fd = await fsOpen(env.daemon.logFilePath, 'a');
  const p = crossSpawn.spawn(process.argv[0], [process.argv[1], 'daemon', '--verbose', '--no-interactive', '--log-timestamps'], {
    cwd: env.config.directory,
    detached: true,
    stdio: ['ignore', fd, fd],
  });

  p.unref();

  env.log.info(`Daemon pid: ${chalk.bold(String(p.pid))}`);
  env.tasks.end();

  return p.pid;
}
