import * as path from 'path';
import * as chalk from 'chalk';

import { ConfigFile, IConfig } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { ERROR_FILE_NOT_FOUND, fsMkdirp, fsStat, fsReadJsonFile, fsWriteJsonFile } from './utils/fs';
import { load } from './modules';

export abstract class BaseConfig<T> implements IConfig<T> {
  public filePath: string;
  protected configFile?: T;
  protected originalConfigFile?: T;

  constructor(public directory: string, public fileName: string) {
    this.filePath = path.resolve(directory, fileName);
  }

  abstract provideDefaults(o: { [key: string]: any }): { [key: string]: any };

  abstract is<T>(o: { [key: string]: any }): o is T;

  async load(): Promise<T> {
    if (!this.configFile) {
      let o: { [key: string]: any };

      try {
        o = await fsReadJsonFile(this.filePath);
      } catch (e) {
        if (e === ERROR_FILE_NOT_FOUND) {
          o = {};
        } else {
          throw e;
        }
      }

      o = this.provideDefaults(o);

      if (this.is<T>(o)) {
        this.configFile = o;
        const lodash = load('lodash');
        this.originalConfigFile = lodash.cloneDeep(o);
      } else {
        throw new FatalException(`The config file (${chalk.bold(prettyPath(this.filePath))}) has an unrecognized format.\n`
                               + `Try deleting the file.`);
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
          let stats = await fsStat(dirPath);
          if (!stats.isDirectory()) {
            throw `${dirPath} must be a directory it is currently a file`;
          }
        } catch (e) {
          await fsMkdirp(dirPath);
        }
        await fsWriteJsonFile(this.filePath, configFile, { encoding: 'utf8' });
        this.configFile = configFile;
        this.originalConfigFile = lodash.cloneDeep(configFile);
      }
    }
  }
}

export class Config extends BaseConfig<ConfigFile> {
  provideDefaults(o: any): any {
    const lodash = load('lodash');
    const results = lodash.cloneDeep(o);

    if (!results.lastUpdated) {
      results.lastUpdated = new Date().toISOString();
    }

    if (!results.urls) {
      results.urls = {};
    }

    if (!results.urls.api) {
      results.urls.api = 'https://api.ionic.io';
    }

    if (!results.urls.dash) {
      results.urls.dash = 'https://apps.ionic.io';
    }

    if (!results.tokens) {
      results.tokens = {};
    }

    if (!results.tokens.appUser) {
      results.tokens.appUser = {};
    }

    if (!results.cliFlags) {
      results.cliFlags = {};
    }

    return results;
  }

  is<ConfigFile>(j: any): j is ConfigFile {
    return typeof j.lastUpdated === 'string'
      && typeof j.urls === 'object'
      && typeof j.urls.api === 'string'
      && typeof j.urls.dash === 'string'
      && typeof j.tokens === 'object'
      && typeof j.tokens.appUser === 'object'
      && typeof j.cliFlags === 'object';
  }
}
