import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { Project } from '../';

import { IAilmentRegistry, InfoItem } from '../../../definitions';
import * as doctorLibType from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class AngularProject extends Project {
  readonly type: 'angular' = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularPkg,
      ionicSchematicsAngularPkg,
      angularCLIPkg,
      angularDevKitCorePkg,
      angularDevKitSchematicsPkg,
    ] = await Promise.all([
      this.getPackageJson('@ionic/angular'),
      this.getPackageJson('@ionic/schematics-angular'),
      this.getPackageJson('@angular/cli'),
      this.getPackageJson('@angular-devkit/core'),
      this.getPackageJson('@angular-devkit/schematics'),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularPkg ? `@ionic/angular ${ionicAngularPkg.version}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/schematics-angular', value: ionicSchematicsAngularPkg ? ionicSchematicsAngularPkg.version : 'not installed' },
      { type: 'local-packages', key: '@angular/cli', value: angularCLIPkg ? angularCLIPkg.version : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/core', value: angularDevKitCorePkg ? angularDevKitCorePkg.version : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/schematics', value: angularDevKitSchematicsPkg ? angularDevKitSchematicsPkg.version : 'not installed' },
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

  async getAilmentRegistry(deps: doctorLibType.AilmentDeps): Promise<IAilmentRegistry> {
    const { registerAilments } = await import('./ailments');

    const registry = await super.getAilmentRegistry(deps);

    await registerAilments(registry, { ...deps, project: this });

    return registry;
  }
}
