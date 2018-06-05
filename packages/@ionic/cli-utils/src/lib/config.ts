import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';

import { ParsedArgs } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { ERROR_FILE_INVALID_JSON, fsMkdirp, fsReadJsonFile, fsStat, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { str2num } from '@ionic/cli-framework/utils/string';

import {
  ConfigFile,
  IBaseConfig,
  IConfig,
  IonicEnvironment,
} from '../definitions';

import { FatalException } from './errors';

export abstract class BaseConfig<T> implements IBaseConfig<T> {
  readonly directory: string;
  readonly filePath: string;
  protected configFile?: T;
  protected originalConfigFile?: { [key: string]: any };

  constructor(directory: string, public readonly fileName: string, public readonly name: string) {
    this.directory = directory ? path.resolve(directory) : ''; // TODO: better way to check if in project
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
              `The config file (${chalk.bold(prettyPath(this.filePath))}) is not valid JSON format.\n` +
              `Please fix any JSON errors in the file.`
            );
          } else {
            throw e;
          }
        }
      }

      this.originalConfigFile = lodash.cloneDeep(o);

      o = await this.provideDefaults(o);

      if (this.is(o)) {
        this.configFile = o;
      } else {
        throw new FatalException(
          `The config file (${chalk.bold(prettyPath(this.filePath))}) has an unrecognized JSON format.\n` +
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
      if (!lodash.isEqual(configFile, this.originalConfigFile)) {
        await fsWriteJsonFile(this.filePath, configFile, { encoding: 'utf8' });

        this.configFile = configFile;
        this.originalConfigFile = lodash.cloneDeep(configFile);
      }
    }
  }
}

export const CONFIG_FILE = 'config.json';
export const DEFAULT_CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

export class Config extends BaseConfig<ConfigFile> implements IConfig {
  async provideDefaults(o: any): Promise<ConfigFile> {
    const results = lodash.cloneDeep(o);

    if (!results.state) {
      results.state = {};
    }

    if (!results.state.lastCommand) {
      results.state.lastCommand = new Date().toISOString();
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

    if (typeof results.user.id === 'string') {
      results.user.id = str2num(results.user.id);
    }

    if (!results.tokens) {
      results.tokens = {};
    }

    if (!results.features) {
      results.features = {};
    }

    if (typeof results.telemetry === 'undefined') {
      results.telemetry = true;
    }

    if (typeof results.npmClient === 'undefined') {
      results.npmClient = results.yarn ? 'yarn' : 'npm';
    }

    if (!results.doctor) {
      results.doctor = {};
    }

    if (!results.doctor.issues) {
      results.doctor.issues = {};
    }

    if (results.state.doctor && results.state.doctor.ignored) {
      for (const issue of results.state.doctor.ignored) {
        results.doctor.issues[issue] = { ignored: true };
      }
    }

    delete results.state.doctor;
    delete results.created;
    delete results.daemon;
    delete results.version;
    delete results.devapp;
    delete results.tokens.appUser;
    delete results.yarn;
    delete results.backend;
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
      && typeof j.user === 'object'
      && typeof j.tokens === 'object'
      && typeof j.telemetry === 'boolean'
      && typeof j.npmClient === 'string'
      && typeof j.features === 'object'
      && typeof j.doctor === 'object'
      && typeof j.doctor.issues === 'object';
  }

  async getAPIUrl(): Promise<string> {
    const config = await this.load();

    if (config.addresses.apiUrl) {
      return config.addresses.apiUrl;
    }

    return 'https://api.ionicjs.com';
  }

  async getDashUrl(): Promise<string> {
    const config = await this.load();

    if (config.addresses.dashUrl) {
      return config.addresses.dashUrl;
    }

    return 'https://dashboard.ionicframework.com';
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

export function gatherFlags(argv: ParsedArgs): IonicEnvironment['flags'] {
  return {
    interactive: typeof argv['interactive'] === 'undefined' ? true : argv['interactive'],
    confirm: typeof argv['confirm'] === 'undefined' ? false : argv['confirm'],
  };
}
