import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/npm';

import { IAilmentRegistry, InfoItem, ProjectPersonalizationDetails, ProjectType } from '../../../definitions';

import { BaseProject } from '../';
import { ANGULAR_CLI_FILE, readAngularCLIJsonFile } from './utils';
import * as doctorLibType from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class Project extends BaseProject {
  type: ProjectType = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularVersion,
      ionicCoreVersion,
      ionicSchematicsAngularVersion,
      angularCLIVersion,
      angularDevKitCoreVersion,
      angularDevKitSchematicsVersion,
    ] = await Promise.all([
      this.getFrameworkVersion(),
      this.getCoreVersion(),
      this.getIonicSchematicsAngularVersion(),
      this.getAngularCLIVersion(),
      this.getAngularDevKitCoreVersion(),
      this.getAngularDevKitCoreVersion(),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `@ionic/angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/core', value: ionicCoreVersion ? ionicCoreVersion : 'not installed' },
      { type: 'local-packages', key: '@ionic/schematics-angular', value: ionicSchematicsAngularVersion ? ionicSchematicsAngularVersion : 'not installed' },
      { type: 'local-packages', key: '@angular/cli', value: angularCLIVersion ? angularCLIVersion : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/core', value: angularDevKitCoreVersion ? angularDevKitCoreVersion : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/schematics', value: angularDevKitSchematicsVersion ? angularDevKitSchematicsVersion : 'not installed' },
    ];
  }

  async detected() {
    try {
      const pkg = await this.loadPackageJson();
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

  async getAilmentRegistry(deps: doctorLibType.AutomaticallyTreatableAilmentDeps): Promise<IAilmentRegistry> {
    const { registerAilments } = await import('./ailments');

    const registry = await super.getAilmentRegistry(deps);

    registerAilments(registry, { ...deps, project: this });

    return registry;
  }

  async getFrameworkVersion() {
    const pkgName = '@ionic/angular';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getCoreVersion() {
    const pkgName = '@ionic/core';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getAngularCLIVersion() {
    const pkgName = '@angular/cli';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getAngularDevKitCoreVersion() {
    const pkgName = '@angular-devkit/core';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getAngularDevKitSchematicsVersion() {
    const pkgName = '@angular-devkit/schematics';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getIonicSchematicsAngularVersion() {
    const pkgName = '@ionic/schematics-angular';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }
}
