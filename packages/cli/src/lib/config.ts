import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';

import { ConfigFile, IConfig } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { readJsonFile, writeJsonFile } from './utils/fs';

export abstract class BaseConfig<T> implements IConfig<T> {
  public static directory: string;
  public configFilePath: string;

  protected configFile?: T;

  constructor(public configFileName: string) {
    this.configFilePath = path.resolve(BaseConfig.directory, configFileName);
  }

  abstract provideDefaults(o: { [key: string]: any }): void;

  abstract is<T>(o: { [key: string]: any }): o is T;

  async load(): Promise<T> {
    if (!this.configFile) {
      let o = await readJsonFile(this.configFilePath);
      this.provideDefaults(o);

      if (this.is<T>(o)) {
        this.configFile = o;
      } else {
        throw new FatalException(`The config file (${chalk.bold(prettyPath(this.configFilePath))}) has an unrecognized format.\n`
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
      await writeJsonFile(this.configFilePath, configFile);
    }
  }
}

export class Config extends BaseConfig<ConfigFile> {
  provideDefaults(o: { [key: string]: any }): void {
    if (!o['urls']) {
      o['urls'] = {};
    }

    if (!o['urls']['api']) {
      o['urls']['api'] = 'https://api.ionic.io';
    }
  }

  is<ConfigFile>(j: { [key: string]: any }): j is ConfigFile {
    return typeof j['lastUpdated'] === 'string'
      && typeof j['urls'] === 'object'
      && typeof j['urls']['api'] === 'string';
  }
}
