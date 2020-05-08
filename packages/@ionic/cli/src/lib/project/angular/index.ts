import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { Project } from '../';
import { IAilmentRegistry, InfoItem } from '../../../definitions';
import { strong } from '../../color';

const debug = Debug('ionic:lib:project:angular');

export class AngularProject extends Project {
  readonly type: 'angular' = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ ionicAngularPkg, ionicAngularPkgPath ],
      [ ionicAngularToolkitPkg, ionicAngularToolkitPkgPath ],
      [ angularCLIPkg, angularCLIPkgPath ],
      [ angularDevKitBuildAngularPkg, angularDevKitBuildAngularPkgPath ],
      [ angularDevKitSchematicsPkg, angularDevKitSchematicsPkgPath ],
    ] = await Promise.all([
      this.getPackageJson('@ionic/angular'),
      this.getPackageJson('@ionic/angular-toolkit'),
      this.getPackageJson('@angular/cli'),
      this.getPackageJson('@angular-devkit/build-angular'),
      this.getPackageJson('@angular-devkit/schematics'),
    ]);

    return [
      ...(await super.getInfo()),
      {
        group: 'ionic',
        name: 'Ionic Framework',
        key: 'framework',
        value: ionicAngularPkg ? `@ionic/angular ${ionicAngularPkg.version}` : 'not installed',
        path: ionicAngularPkgPath,
      },
      {
        group: 'ionic',
        name: '@ionic/angular-toolkit',
        key: 'ionic_angular_toolkit_version',
        value: ionicAngularToolkitPkg ? ionicAngularToolkitPkg.version : 'not installed',
        path: ionicAngularToolkitPkgPath,
      },
      {
        group: 'ionic',
        name: '@angular/cli',
        key: 'angular_cli_version',
        value: angularCLIPkg ? angularCLIPkg.version : 'not installed',
        path: angularCLIPkgPath,
      },
      {
        group: 'ionic',
        name: '@angular-devkit/build-angular',
        value: angularDevKitBuildAngularPkg ? angularDevKitBuildAngularPkg.version : 'not installed',
        path: angularDevKitBuildAngularPkgPath,
      },
      {
        group: 'ionic',
        name: '@angular-devkit/schematics',
        value: angularDevKitSchematicsPkg ? angularDevKitSchematicsPkg.version : 'not installed',
        path: angularDevKitSchematicsPkgPath,
      },
    ];
  }

  async detected() {
    try {
      const pkg = await this.requirePackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/angular'] === 'string') {
        debug(`${strong('@ionic/angular')} detected in ${strong('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async requireBuildRunner(): Promise<import('./build').AngularBuildRunner> {
    const { AngularBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new AngularBuildRunner(deps);
  }

  async requireServeRunner(): Promise<import('./serve').AngularServeRunner> {
    const { AngularServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new AngularServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<import('./generate').AngularGenerateRunner> {
    const { AngularGenerateRunner } = await import('./generate');
    const deps = { ...this.e, project: this };
    return new AngularGenerateRunner(deps);
  }

  async registerAilments(registry: IAilmentRegistry): Promise<void> {
    await super.registerAilments(registry);
    // TODO: register angular project ailments
  }

  setPrimaryTheme(themeColor: string): Promise<void> {
    const themePath = path.join(this.directory, 'src', 'theme', 'variables.scss');
    return this.writeThemeColor(themePath, themeColor);
  }
}
