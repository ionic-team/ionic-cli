import * as path from 'path';
import * as os from 'os';

import chalk from 'chalk';
import * as minimistType from 'minimist';

import {
  ConfigFile,
  IBaseConfig,
  IConfig,
  IonicEnvironment,
} from '../definitions';

import { BACKEND_PRO } from './backends';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { ERROR_FILE_INVALID_JSON, fsMkdirp, fsReadJsonFile, fsStat, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';

export abstract class BaseConfig<T> implements IBaseConfig<T> {
  public directory: string;
  public filePath: string;
  protected configFile?: T;
  protected originalConfigFile?: { [key: string]: any };

  constructor(directory: string, public fileName: string) {
    // TODO: better way to check if in project
    if (directory) {
      this.directory = path.resolve(directory);
    } else {
      this.directory = '';
    }

    this.filePath = path.resolve(this.directory, fileName);
  }

  abstract provideDefaults(o: { [key: string]: any }): Promise<T>;

  abstract is(o: any): o is T;

  async prepare() {
    try {
      const stats = await fsStat(this.directory);

      if (!stats.isDirectory()) {
        throw new FatalException(`${chalk.bold(this.directory)} appears to be a file, but it must be a directory.`);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }

      await fsMkdirp(this.directory);
    }
  }

  async load(options: { disk?: boolean; } = {}): Promise<T> {
    if (options.disk || !this.configFile) {
      let o: { [key: string]: any } | undefined;

      try {
        const stats = await fsStat(this.filePath);

        if (stats.size < 5) {
          o = {};
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }

        o = {};
      }

      if (typeof o === 'undefined') {
        try {
          o = await fsReadJsonFile(this.filePath);
        } catch (e) {
          if (e === ERROR_FILE_INVALID_JSON) {
            throw new FatalException(
              `The config file (${chalk.bold(prettyPath(this.filePath))}) is not valid JSON format.\n\n` +
              `Please fix any JSON errors in the file.`
            );
          } else {
            throw e;
          }
        }
      }

      const cloneDeep = await import('lodash/cloneDeep');
      this.originalConfigFile = cloneDeep(o);

      o = await this.provideDefaults(o);

      if (this.is(o)) {
        this.configFile = o;
      } else {
        throw new FatalException(
          `The config file (${chalk.bold(prettyPath(this.filePath))}) has an unrecognized JSON format.\n\n` +
          `This usually means a key had an unexpected value. Please look through it and fix any issues.\n` +
          `If all else fails--the CLI will recreate the file if you delete it.`
        );
      }
    }

    return this.configFile;
  }

  async save(configFile?: T): Promise<void> {
    if (!configFile) {
      configFile = this.configFile;
    }

    if (configFile) {
      const [ isEqual, cloneDeep ] = await Promise.all([import('lodash/isEqual'), import('lodash/cloneDeep')]);

      if (!isEqual(configFile, this.originalConfigFile)) {
        await fsWriteJsonFile(this.filePath, configFile, { encoding: 'utf8' });

        this.configFile = configFile;
        this.originalConfigFile = cloneDeep(configFile);
      }
    }
  }
}

export const CONFIG_FILE = 'config.json';
export const DEFAULT_CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

export class Config extends BaseConfig<ConfigFile> implements IConfig {
  async provideDefaults(o: any): Promise<ConfigFile> {
    const cloneDeep = await import('lodash/cloneDeep');
    const results = cloneDeep(o);

    if (!results.state) {
      results.state = {};
    }

    if (!results.state.doctor) {
      results.state.doctor = {};
    }

    if (typeof results.state.doctor.ignored === 'undefined') {
      results.state.doctor.ignored = [];
    }

    if (!results.state.lastCommand) {
      if (results.lastCommand) {
        results.state.lastCommand = results.lastCommand;
      } else {
        results.state.lastCommand = new Date().toISOString();
      }
    }

    if (!results.created) {
      results.created = new Date().toISOString();
    }

    if (!results.daemon) {
      results.daemon = {};
    }

    if (typeof results.daemon.updates === 'undefined') {
      results.daemon.updates = true;
    }

    if (!results.addresses) {
      results.addresses = {};
    }

    if (!results.git) {
      results.git = {};
    }

    if (!results.user) {
      results.user = {};
    }

    if (!results.tokens) {
      results.tokens = {};
    }

    if (!results.tokens.appUser) {
      results.tokens.appUser = {};
    }

    if (typeof results.backend !== 'string') {
      results.backend = BACKEND_PRO;
    }

    if (typeof results.telemetry === 'undefined') {
      if (results.cliFlags && typeof results.cliFlags.enableTelemetry !== 'undefined') {
        results.telemetry = results.cliFlags.enableTelemetry;
      } else if (results.cliFlags && typeof results.cliFlags.telemetry !== 'undefined') {
        results.telemetry = results.cliFlags.telemetry;
      } else {
        results.telemetry = true;
      }
    }

    if (typeof results.yarn === 'undefined') {
      if (results.cliFlags && typeof results.cliFlags.yarn !== 'undefined') {
        results.yarn = results.cliFlags.yarn;
      } else {
        results.yarn = false;
      }
    }

    delete results.lastCommand;
    delete results.lastUpdated;
    delete results.cliFlags;

    delete results.urls;
    delete results.git.host;
    delete results.git.port;

    return results;
  }

  is(j: any): j is ConfigFile {
    return j
      && typeof j.addresses === 'object'
      && typeof j.state === 'object'
      && typeof j.state.lastCommand === 'string'
      && typeof j.state.doctor === 'object'
      && typeof j.daemon === 'object'
      && typeof j.user === 'object'
      && typeof j.tokens === 'object'
      && typeof j.tokens.appUser === 'object'
      && typeof j.backend === 'string'
      && typeof j.telemetry === 'boolean'
      && typeof j.yarn === 'boolean';
  }

  async isUpdatingEnabled(): Promise<boolean> {
    const config = await this.load();

    if (!config.daemon.updates) {
      return false;
    }

    return !config.state.lastNoResponseToUpdate || (new Date().getTime() - new Date(config.state.lastNoResponseToUpdate).getTime() > 86400000);
  }

  async getAPIUrl(): Promise<string> {
    const config = await this.load();

    if (config.addresses.apiUrl) {
      return config.addresses.apiUrl;
    }

    if (config.backend === 'legacy') {
      return 'https://api.ionic.io';
    }

    return 'https://api.ionicjs.com';
  }

  async getDashUrl(): Promise<string> {
    const config = await this.load();

    if (config.addresses.dashUrl) {
      return config.addresses.dashUrl;
    }

    if (config.backend === 'legacy') {
      return 'https://apps.ionic.io';
    }

    return 'https://dashboard.ionicjs.com';
  }

  async getGitHost(): Promise<string> {
    const config = await this.load();

    if (config.addresses.gitHost) {
      return config.addresses.gitHost;
    }

    return 'git.ionicjs.com';
  }

  async getGitPort(): Promise<number> {
    const config = await this.load();

    if (config.addresses.gitPort) {
      return config.addresses.gitPort;
    }

    return 22;
  }
}

export function gatherFlags(argv: minimistType.ParsedArgs): IonicEnvironment['flags'] {
  return {
    interactive: typeof argv['interactive'] === 'undefined' ? true : argv['interactive'],
    confirm: typeof argv['confirm'] === 'undefined' ? false : argv['confirm'],
  };
}
