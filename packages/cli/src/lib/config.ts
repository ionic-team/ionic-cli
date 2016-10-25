import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';

import { ConfigFile, IConfig } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { readJsonFile, writeJsonFile } from './utils/json';

const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

function isConfigFile(j: { [key: string]: any }): j is ConfigFile {
  return typeof j['lastUpdated'] === 'string'
    && typeof j['urls'] === 'object'
    && typeof j['urls']['api'] === 'string';
}

export class Config implements IConfig {
  public directory: string;
  public configFilePath: string;

  protected configFile?: ConfigFile;

  constructor(public env: { [k: string]: string }) {
    this.directory = this.env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY;
    this.configFilePath = path.resolve(this.directory, CONFIG_FILE);
  }

  protected provideDefaults(o: { [key: string]: any }) {
    if (!o['urls']) {
      o['urls'] = {};
    }

    if (!o['urls']['api']) {
      o['urls']['api'] = 'https://api.ionic.io';
    }
  }

  async load(): Promise<ConfigFile> {
    if (!this.configFile) {
      let o = await readJsonFile(this.configFilePath);
      this.provideDefaults(o);

      if (isConfigFile(o)) {
        this.configFile = o;
      } else {
        throw new FatalException(`The config file (${chalk.bold(prettyPath(this.configFilePath))}) has an unrecognized format.\n`
                               + `Try deleting the file.`);
      }
    }

    return this.configFile;
  }

  async save(configFile?: ConfigFile): Promise<void> {
    if (!configFile) {
      configFile = this.configFile;
    }

    if (configFile) {
      await writeJsonFile(configFile, this.configFilePath);
    }
  }
}
