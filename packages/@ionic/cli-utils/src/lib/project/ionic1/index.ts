import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { BowerJson } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { ERROR_FILE_INVALID_JSON, fsReadJsonFile } from '@ionic/cli-framework/utils/fs';
import { ERROR_INVALID_BOWER_JSON, readBowerJsonFile, readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { InfoItem, ProjectType } from '../../../definitions';
import { FatalException } from '../../errors';

import { BaseProject } from '../';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class Project extends BaseProject {
  type: ProjectType = 'ionic1';
  protected bowerJsonFile?: BowerJson;

  async getInfo(): Promise<InfoItem[]> {
    const [ ionic1Version, v1UtilVersion ] = await Promise.all([this.getFrameworkVersion(), this.getV1UtilVersion()]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' },
      { type: 'local-packages', key: '@ionic/v1-util', value: v1UtilVersion ? v1UtilVersion : 'not installed' },
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

  async getSourceDir(): Promise<string> {
    const project = await this.load();

    if (project.documentRoot) {
      return path.resolve(this.directory, project.documentRoot);
    }

    return path.resolve(this.directory, 'www');
  }

  async getFrameworkVersion(): Promise<string | undefined> {
    const ionicVersionFilePath = path.resolve(this.directory, 'www', 'lib', 'ionic', 'version.json'); // TODO
    const bowerJsonPath = path.resolve(this.directory, 'bower.json');

    try {
      try {
        const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
        return ionicVersionJson['version'];
      } catch (e) {
        this.log.warn(`Error with ${chalk.bold(prettyPath(ionicVersionFilePath))} file: ${e}, trying ${chalk.bold(prettyPath(bowerJsonPath))}.`);

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
      this.log.error(`Error with ${chalk.bold(prettyPath(bowerJsonPath))} file: ${e}`);
    }
  }

  async getV1UtilVersion(): Promise<string | undefined> {
    const pkgPath = path.resolve(this.directory, 'node_modules', '@ionic', 'v1-util', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }

  async loadBowerJson(): Promise<BowerJson> {
    if (!this.bowerJsonFile) {
      const bowerJsonPath = path.resolve(this.directory, 'bower.json');
      try {
        this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
      } catch (e) {
        if (e === ERROR_FILE_INVALID_JSON) {
          throw new FatalException(`Could not parse ${chalk.bold('bower.json')}. Is it a valid JSON file?`);
        } else if (e === ERROR_INVALID_BOWER_JSON) {
          throw new FatalException(`The ${chalk.bold('bower.json')} file seems malformed.`);
        }

        throw e; // Probably file not found
      }
    }

    return this.bowerJsonFile;
  }
}
