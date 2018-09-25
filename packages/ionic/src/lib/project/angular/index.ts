import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { Project } from '../';
import { IAilmentRegistry, InfoItem } from '../../../definitions';

import * as ζbuild from './build';
import * as ζgenerate from './generate';
import * as ζserve from './serve';

const debug = Debug('ionic:lib:project:angular');

export class AngularProject extends Project {
  readonly type: 'angular' = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ ionicAngularPkg, ionicAngularPkgPath ],
      [ ionicSchematicsAngularPkg, ionicSchematicsAngularPkgPath ],
      [ ionicNgToolkitPkg, ionicNgToolkitPkgPath ],
      [ angularCLIPkg, angularCLIPkgPath ],
      [ angularDevKitCorePkg, angularDevKitCorePkgPath ],
      [ angularDevKitSchematicsPkg, angularDevKitSchematicsPkgPath ],
    ] = await Promise.all([
      this.getPackageJson('@ionic/angular'),
      this.getPackageJson('@ionic/schematics-angular'),
      this.getPackageJson('@ionic/ng-toolkit'),
      this.getPackageJson('@angular/cli'),
      this.getPackageJson('@angular-devkit/core'),
      this.getPackageJson('@angular-devkit/schematics'),
    ]);

    return [
      ...(await super.getInfo()),
      { group: 'ionic', key: 'Ionic Framework', value: ionicAngularPkg ? `@ionic/angular ${ionicAngularPkg.version}` : 'not installed', path: ionicAngularPkgPath },
      { group: 'ionic', key: '@ionic/ng-toolkit', value: ionicNgToolkitPkg ? ionicNgToolkitPkg.version : 'not installed', path: ionicNgToolkitPkgPath },
      { group: 'ionic', key: '@ionic/schematics-angular', value: ionicSchematicsAngularPkg ? ionicSchematicsAngularPkg.version : 'not installed', path: ionicSchematicsAngularPkgPath },
      { group: 'ionic', key: '@angular/cli', value: angularCLIPkg ? angularCLIPkg.version : 'not installed', path: angularCLIPkgPath },
      { group: 'ionic', key: '@angular-devkit/core', value: angularDevKitCorePkg ? angularDevKitCorePkg.version : 'not installed', path: angularDevKitCorePkgPath },
      { group: 'ionic', key: '@angular-devkit/schematics', value: angularDevKitSchematicsPkg ? angularDevKitSchematicsPkg.version : 'not installed', path: angularDevKitSchematicsPkgPath },
    ];
  }

  async detected() {
    try {
      const pkg = await this.requirePackageJson();
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

  async requireBuildRunner(): Promise<ζbuild.AngularBuildRunner> {
    const { AngularBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new AngularBuildRunner(deps);
  }

  async requireServeRunner(): Promise<ζserve.AngularServeRunner> {
    const { AngularServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new AngularServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<ζgenerate.AngularGenerateRunner> {
    const { AngularGenerateRunner } = await import('./generate');
    const deps = { ...this.e, project: this };
    return new AngularGenerateRunner(deps);
  }

  async registerAilments(registry: IAilmentRegistry): Promise<void> {
    await super.registerAilments(registry);
    // TODO: register angular project ailments
  }
}
