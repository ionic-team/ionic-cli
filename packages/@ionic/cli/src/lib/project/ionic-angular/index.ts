import * as Debug from 'debug';
import * as lodash from 'lodash';

import { Project } from '../';
import { IAilmentRegistry, InfoItem } from '../../../definitions';
import { strong } from '../../color';

const debug = Debug('ionic:lib:project:ionic-angular');

export class IonicAngularProject extends Project {
  readonly type: 'ionic-angular' = 'ionic-angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ ionicAngularPkg ],
      [ appScriptsPkg ],
    ] = await Promise.all([
      this.getPackageJson('ionic-angular'),
      this.getPackageJson('@ionic/app-scripts'),
    ]);

    return [
      ...(await super.getInfo()),
      {
        group: 'ionic',
        name: 'Ionic Framework',
        key: 'framework',
        value: ionicAngularPkg ? `ionic-angular ${ionicAngularPkg.version}` : 'not installed',
      },
      {
        group: 'ionic',
        name: '@ionic/app-scripts',
        key: 'app_scripts_version',
        value: appScriptsPkg ? appScriptsPkg.version : 'not installed',
      },
    ];
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ion.link/v3-docs';
  }

  async registerAilments(registry: IAilmentRegistry): Promise<void> {
    await super.registerAilments(registry);
    const ailments = await import('./ailments');
    const deps = { ...this.e, project: this };

    registry.register(new ailments.IonicAngularUpdateAvailable(deps));
    registry.register(new ailments.IonicAngularMajorUpdateAvailable(deps));
    registry.register(new ailments.AppScriptsUpdateAvailable(deps));
    registry.register(new ailments.AppScriptsMajorUpdateAvailable(deps));
    registry.register(new ailments.IonicAngularPackageJsonHasDefaultIonicBuildCommand(deps));
    registry.register(new ailments.IonicAngularPackageJsonHasDefaultIonicServeCommand(deps));
  }

  async detected() {
    try {
      const pkg = await this.requirePackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['ionic-angular'] === 'string') {
        debug(`${strong('ionic-angular')} detected in ${strong('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async requireBuildRunner(): Promise<import('./build').IonicAngularBuildRunner> {
    const { IonicAngularBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new IonicAngularBuildRunner(deps);
  }

  async requireServeRunner(): Promise<import('./serve').IonicAngularServeRunner> {
    const { IonicAngularServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new IonicAngularServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<import('./generate').IonicAngularGenerateRunner> {
    const { IonicAngularGenerateRunner } = await import('./generate');
    const deps = { ...this.e, project: this };
    return new IonicAngularGenerateRunner(deps);
  }
}
