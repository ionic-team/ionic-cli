import * as path from 'path';

import * as chalk from 'chalk';

import { ConfigFile, IConfig } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { ERROR_FILE_NOT_FOUND, fsReadJsonFile, fsWriteJsonFile } from './utils/fs';
import { cloneDeep, isEqual } from 'lodash';

export abstract class BaseConfig<T> implements IConfig<T> {
  public filePath: string;
  protected configFile?: T;
  protected originalConfigFile?: T;

  constructor(public directory: string, public fileName: string) {
    this.filePath = path.resolve(directory, fileName);
  }

  abstract provideDefaults(o: { [key: string]: any }): void;

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

      this.provideDefaults(o);

      if (this.is<T>(o)) {
        this.configFile = o;
        this.originalConfigFile = cloneDeep(o);
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

    if (configFile && !isEqual(configFile, this.originalConfigFile)) {
      await fsWriteJsonFile(this.filePath, configFile, { encoding: 'utf8' });
      this.configFile = configFile;
      this.originalConfigFile = cloneDeep(configFile);
    }
  }
}

export class Config extends BaseConfig<ConfigFile> {
  provideDefaults(o: any): void {
    if (!o.lastUpdated) {
      o.lastUpdated = new Date().toISOString();
    }

    if (!o.urls) {
      o.urls = {};
    }

    if (!o.urls.api) {
      o.urls.api = 'https://api.ionic.io';
    }

    if (!o.tokens) {
      o.tokens = {};
    }

    if (!o.tokens.appUser) {
      o.tokens.appUser = {};
    }
  }

  is<ConfigFile>(j: any): j is ConfigFile {
    return typeof j.lastUpdated === 'string'
      && typeof j.urls === 'object'
      && typeof j.urls.api === 'string'
      && typeof j.tokens === 'object'
      && typeof j.tokens.appUser === 'object';
  }
}
