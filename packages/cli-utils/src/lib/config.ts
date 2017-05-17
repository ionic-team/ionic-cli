import * as path from 'path';
import * as os from 'os';

import * as chalk from 'chalk';

import { ConfigFile, IConfig, CliFlag, IonicEnvironment } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { ERROR_FILE_NOT_FOUND, ERROR_FILE_INVALID_JSON, fsMkdirp, fsStat, fsReadJsonFile, fsWriteJsonFile } from './utils/fs';
import { load } from './modules';

export const CLI_FLAGS: CliFlag[] = ['interactive', 'telemetry', 'yarn'];

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

  abstract provideDefaults(o: { [key: string]: any }): Promise<{ [key: string]: any }>;

  abstract is<T>(o: { [key: string]: any }): o is T;

  async load(): Promise<T> {
    if (!this.configFile) {
      let o: { [key: string]: any };

      try {
        o = await fsReadJsonFile(this.filePath);
      } catch (e) {
        if (e === ERROR_FILE_NOT_FOUND) {
          o = {};
        } else if (e === ERROR_FILE_INVALID_JSON) {
          throw new FatalException(
            `The config file (${chalk.bold(prettyPath(this.filePath))}) is not valid JSON format.\n\n` +
            `Please fix any JSON errors in the file.`
          );
        } else {
          throw e;
        }
      }

      const lodash = load('lodash');
      this.originalConfigFile = lodash.cloneDeep(o);

      o = await this.provideDefaults(o);

      if (this.is<T>(o)) {
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

export const CONFIG_FILE = 'config.json';
export const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

export class Config extends BaseConfig<ConfigFile> {
  async provideDefaults(o: any): Promise<any> {
    const lodash = load('lodash');
    const results = lodash.cloneDeep(o);

    if (!results.lastCommand) {
      results.lastCommand = new Date().toISOString();
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

    if (typeof results.cliFlags.telemetry === 'undefined') {
      if (typeof results.cliFlags.enableTelemetry !== 'undefined') {
        results.cliFlags.telemetry = results.cliFlags.enableTelemetry;
      } else {
        results.cliFlags.telemetry = true;
      }
    }

    delete results.lastUpdated;
    delete results.cliFlags.promptedForTelemetry;
    delete results.cliFlags.promptedForSignup;
    delete results.cliFlags.enableTelemetry;

    return results;
  }

  is<ConfigFile>(j: any): j is ConfigFile {
    return j
      && typeof j.lastCommand === 'string'
      && typeof j.urls === 'object'
      && typeof j.urls.api === 'string'
      && typeof j.urls.dash === 'string'
      && typeof j.tokens === 'object'
      && typeof j.tokens.appUser === 'object'
      && typeof j.cliFlags === 'object';
  }
}

export async function handleCliFlags(env: IonicEnvironment, argv: { [key: string]: any; }) {
  const configData = await env.config.load();

  for (let cliFlag of CLI_FLAGS) {
    if (typeof argv[cliFlag] === 'boolean') {
      configData.cliFlags[cliFlag] = argv[cliFlag];
    }
  }
}
