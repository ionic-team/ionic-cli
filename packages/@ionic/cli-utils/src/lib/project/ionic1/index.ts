import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsReadJsonFile } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { Project } from '../';
import { InfoItem } from '../../../definitions';
import { FatalException, RunnerNotFoundException } from '../../errors';

import * as ζbuild from './build';
import * as ζserve from './serve';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export const ERROR_INVALID_BOWER_JSON = 'INVALID_BOWER_JSON';

export interface BowerJson {
  name: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

function isBowerJson(obj: any): obj is BowerJson {
  return obj && typeof obj.name === 'string';
}

async function readBowerJsonFile(p: string): Promise<BowerJson> {
  const bowerJson = await fsReadJsonFile(p);

  if (!isBowerJson(bowerJson)) {
    throw ERROR_INVALID_BOWER_JSON;
  }

  return bowerJson;
}

export class Ionic1Project extends Project {
  readonly type: 'ionic1' = 'ionic1';
  protected bowerJsonFile?: BowerJson;

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionic1Version,
      [ v1ToolkitPkg ],
    ] = await Promise.all([
      this.getFrameworkVersion(),
      this.getPackageJson('@ionic/v1-toolkit'),
    ]);

    return [
      ...(await super.getInfo()),
      { group: 'ionic', key: 'Ionic Framework', value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' },
      { group: 'ionic', key: '@ionic/v1-toolkit', value: v1ToolkitPkg ? v1ToolkitPkg.version : 'not installed' },
    ];
  }

  async detected() {
    try {
      const bwr = await readBowerJsonFile(path.resolve(this.directory, 'bower.json'));
      const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);

      if (typeof deps['ionic'] === 'string') {
        debug(`${chalk.bold('ionic')} detected in ${chalk.bold('bower.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ionicframework.com/docs/v1/';
  }

  // this method search not only package.json
  async getFrameworkVersion(): Promise<string | undefined> {
    const ionicVersionFilePath = path.resolve(await this.getDistDir(), 'lib', 'ionic', 'version.json'); // TODO
    const bowerJsonPath = path.resolve(this.directory, 'bower.json');

    try {
      try {
        const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
        return ionicVersionJson['version'];
      } catch (e) {
        const bwr = await this.loadBowerJson();
        const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);

        const ionicEntry = deps['ionic'];

        if (!ionicEntry) {
          return;
        }

        const m = ionicEntry.match(/.+#(.+)/);

        if (m && m[1]) {
          return m[1];
        }
      }
    } catch (e) {
      this.e.log.error(`Error with ${chalk.bold(prettyPath(bowerJsonPath))} file: ${e}`);
    }
  }

  async loadBowerJson(): Promise<BowerJson> {
    if (!this.bowerJsonFile) {
      const bowerJsonPath = path.resolve(this.directory, 'bower.json');
      try {
        this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new FatalException(`Could not parse ${chalk.bold('bower.json')}. Is it a valid JSON file?`);
        } else if (e === ERROR_INVALID_BOWER_JSON) {
          throw new FatalException(`The ${chalk.bold('bower.json')} file seems malformed.`);
        }

        throw e; // Probably file not found
      }
    }

    return this.bowerJsonFile;
  }

  async requireBuildRunner(): Promise<ζbuild.Ionic1BuildRunner> {
    const { Ionic1BuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new Ionic1BuildRunner(deps);
  }

  async requireServeRunner(): Promise<ζserve.Ionic1ServeRunner> {
    const { Ionic1ServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new Ionic1ServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException('Generators are not supported in Ionic 1 projects.');
  }
}
