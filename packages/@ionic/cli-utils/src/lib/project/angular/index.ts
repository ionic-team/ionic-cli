import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { InfoItem, ProjectPersonalizationDetails, ProjectType } from '../../../definitions';

import { BaseProject } from '../';
import { ANGULAR_CLI_FILE, readAngularCLIJsonFile } from './utils';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class Project extends BaseProject {
  type: ProjectType = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularVersion,
      ionicCoreVersion,
      angularCLIVersion,
    ] = await Promise.all([
      this.getFrameworkVersion(),
      this.getCoreVersion(),
      this.getAngularCLIVersion(),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `@ionic/angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/core', value: ionicCoreVersion ? ionicCoreVersion : 'not installed' },
      { type: 'local-packages', key: '@angular/cli', value: angularCLIVersion ? angularCLIVersion : 'not installed' },
    ];
  }

  async detected() {
    try {
      const pkg = await readPackageJsonFile(path.resolve(this.directory, 'package.json'));
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/angular'] === 'string') {
        debug(`${chalk.bold('@ionic/angular')} detected in ${chalk.bold('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async personalize(details: ProjectPersonalizationDetails) {
    await super.personalize(details);

    const { appName, displayName } = details;
    const angularJsonPath = path.resolve(this.directory, ANGULAR_CLI_FILE);

    try {
      const angularJson = await readAngularCLIJsonFile(angularJsonPath);
      angularJson.project.name = displayName ? displayName : appName;

      await fsWriteJsonFile(angularJsonPath, angularJson, { encoding: 'utf8' });
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(angularJsonPath))} file: ${e}`);
    }
  }

  async getFrameworkVersion() {
    const pkgPath = path.resolve(this.directory, 'node_modules', '@ionic', 'angular', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }

  async getCoreVersion() {
    const pkgPath = path.resolve(this.directory, 'node_modules', '@ionic', 'core', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }

  async getAngularCLIVersion() {
    const pkgPath = path.resolve(this.directory, 'node_modules', '@angular', 'cli', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }
}
