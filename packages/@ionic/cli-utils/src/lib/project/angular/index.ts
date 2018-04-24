import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { IAilmentRegistry, InfoItem, ProjectType } from '../../../definitions';

import { BaseProject } from '../';
import * as doctorLibType from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class Project extends BaseProject {
  type: ProjectType = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularVersion,
      ionicSchematicsAngularVersion,
      angularCLIVersion,
      angularDevKitCoreVersion,
      angularDevKitSchematicsVersion,
    ] = await Promise.all([
      this.getPackageVersion('@ionic/angular'),
      this.getPackageVersion('@ionic/schematics-angular'),
      this.getPackageVersion('@angular/cli'),
      this.getPackageVersion('@angular-devkit/core'),
      this.getPackageVersion('@angular-devkit/schematics'),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `@ionic/angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/schematics-angular', value: ionicSchematicsAngularVersion ? ionicSchematicsAngularVersion : 'not installed' },
      { type: 'local-packages', key: '@angular/cli', value: angularCLIVersion ? angularCLIVersion : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/core', value: angularDevKitCoreVersion ? angularDevKitCoreVersion : 'not installed' },
      { type: 'local-packages', key: '@angular-devkit/schematics', value: angularDevKitSchematicsVersion ? angularDevKitSchematicsVersion : 'not installed' },
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
