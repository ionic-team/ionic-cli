import * as path from 'path';
import * as os from 'os';

import * as chalk from 'chalk';
import * as minimistType from 'minimist';

import {
  ConfigFile,
  IConfig,
  IonicEnvironment,
} from '../definitions';

import { BACKEND_LEGACY } from './backends';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { ERROR_FILE_INVALID_JSON, fsMkdirp, fsReadJsonFile, fsStat, fsWriteJsonFile } from './utils/fs';
import { load } from './modules';

export abstract class BaseConfig<T> implements IConfig<T> {
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

      const lodash = load('lodash');
      this.originalConfigFile = lodash.cloneDeep(o);

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
      const lodash = load('lodash');

      if (!lodash.isEqual(configFile, this.originalConfigFile)) {
        const dirPath = path.dirname(this.filePath);

        try {
          const stats = await fsStat(dirPath);

          if (!stats.isDirectory()) {
            throw `${dirPath} must be a directory it is currently a file`;
          }
        } catch (e) {
          if (e.code !== 'ENOENT') {
            throw e;
          }

          await fsMkdirp(dirPath);
        }

        await fsWriteJsonFile(this.filePath, configFile, { encoding: 'utf8' });

        this.configFile = configFile;
        this.originalConfigFile = lodash.cloneDeep(configFile);
      }
    }
  }
}

export const CONFIG_FILE = 'config.json';
export const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

export class Config extends BaseConfig<ConfigFile> {
  async provideDefaults(o: any): Promise<ConfigFile> {
    const lodash = load('lodash');
    const results = lodash.cloneDeep(o);

    if (!results.lastCommand) {
      results.lastCommand = new Date().toISOString();
    }

    if (!results.daemon) {
      results.daemon = {};
    }

    if (!results.urls) {
      results.urls = {};
    }

    if (!results.git) {
      results.git = {};
    }

    if (!results.git.host) {
      results.git.host = 'git.ionicjs.com';
    }

    if (!results.urls.api) {
      results.urls.api = 'https://api.ionic.io';
    }

    if (!results.urls.dash) {
      results.urls.dash = 'https://apps.ionic.io';
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
      results.backend = BACKEND_LEGACY;
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

    delete results.lastUpdated;
    results.cliFlags = {}; // TODO: this is temporary

    return results;
  }

  is(j: any): j is ConfigFile {
    return j
      && typeof j.lastCommand === 'string'
      && typeof j.daemon === 'object'
      && typeof j.urls === 'object'
      && typeof j.urls.api === 'string'
      && typeof j.urls.dash === 'string'
      && typeof j.user === 'object'
      && typeof j.tokens === 'object'
      && typeof j.tokens.appUser === 'object'
      && typeof j.backend === 'string'
      && typeof j.telemetry === 'boolean'
      && typeof j.yarn === 'boolean';
  }
}

export function gatherFlags(argv: minimistType.ParsedArgs): IonicEnvironment['flags'] {
  return {
    interactive: typeof argv['interactive'] === 'undefined' ? true : argv['interactive'],
    confirm: typeof argv['confirm'] === 'undefined' ? false : argv['confirm'],
  };
}
