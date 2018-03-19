import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/npm';

import { IAilmentRegistry, InfoItem, ProjectType } from '../../../definitions';

import { BaseProject } from '../';
import * as doctorLibType from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular');

export class Project extends BaseProject {
  type: ProjectType = 'ionic-angular';

  async getInfo(): Promise<InfoItem[]> {
    const [ ionicAngularVersion, appScriptsVersion ] = await Promise.all([this.getFrameworkVersion(), this.getAppScriptsVersion()]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/app-scripts', value: appScriptsVersion ? appScriptsVersion : 'not installed' },
    ];
  }

  async getAilmentRegistry(deps: doctorLibType.AutomaticallyTreatableAilmentDeps): Promise<IAilmentRegistry> {
    const { registerAilments } = await import('./ailments');

    const registry = await super.getAilmentRegistry(deps);

    registerAilments(registry, { ...deps, project: this });

    return registry;
  }

  async detected() {
    try {
      const pkg = await this.loadPackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['ionic-angular'] === 'string') {
        debug(`${chalk.bold('ionic-angular')} detected in ${chalk.bold('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async getFrameworkVersion(): Promise<string | undefined> {
    const pkgName = 'ionic-angular';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async getAppScriptsVersion(): Promise<string | undefined> {
    const pkgName = '@ionic/app-scripts';

    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }
}
