import { prettyPath } from '@ionic/cli-framework/utils/format';
import { readJson } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { Project } from '../';
import { InfoItem } from '../../../definitions';
import { strong } from '../../color';
import { FatalException, RunnerNotFoundException } from '../../errors';

import * as ζbuild from './build';
import * as ζserve from './serve';

const debug = Debug('ionic:lib:project:angular');

export const ERROR_INVALID_BOWER_JSON = 'INVALID_BOWER_JSON';

export interface BowerJson {
  name: string;
  dependencies?: { [key: string]: string | undefined; };
  devDependencies?: { [key: string]: string | undefined; };
}

function isBowerJson(obj: any): obj is BowerJson {
  return obj && typeof obj.name === 'string';
}

async function readBowerJsonFile(p: string): Promise<BowerJson> {
  const bowerJson = await readJson(p);

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
        debug(`${strong('ionic')} detected in ${strong('bower.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async getSourceDir(): Promise<string> {
    return this.getDistDir(); // ionic1's source directory is the dist directory
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ion.link/v1-docs';
  }

  // this method search not only package.json
  async getFrameworkVersion(): Promise<string | undefined> {
    const ionicVersionFilePath = path.resolve(await this.getDistDir(), 'lib', 'ionic', 'version.json'); // TODO
    const bowerJsonPath = path.resolve(this.directory, 'bower.json');

    try {
      try {
        const ionicVersionJson = await readJson(ionicVersionFilePath);
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
      this.e.log.error(`Error with ${strong(prettyPath(bowerJsonPath))} file: ${e}`);
    }
  }

  async loadBowerJson(): Promise<BowerJson> {
    if (!this.bowerJsonFile) {
      const bowerJsonPath = path.resolve(this.directory, 'bower.json');
      try {
        this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new FatalException(`Could not parse ${strong('bower.json')}. Is it a valid JSON file?`);
        } else if (e === ERROR_INVALID_BOWER_JSON) {
          throw new FatalException(`The ${strong('bower.json')} file seems malformed.`);
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
