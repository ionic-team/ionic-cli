import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { IAilmentRegistry, InfoItem } from '../../../definitions';

import { Project } from '../';
import * as ζdoctor from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular');

export class IonicAngularProject extends Project {
  readonly type: 'ionic-angular' = 'ionic-angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularPkg,
      appScriptsPkg,
    ] = await Promise.all([
      this.getPackageJson('ionic-angular'),
      this.getPackageJson('@ionic/app-scripts'),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularPkg ? `ionic-angular ${ionicAngularPkg.version}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/app-scripts', value: appScriptsPkg ? appScriptsPkg.version : 'not installed' },
    ];
  }

  async getAilmentRegistry(deps: ζdoctor.AilmentDeps): Promise<IAilmentRegistry> {
    const { registerAilments } = await import('./ailments');

    const registry = await super.getAilmentRegistry(deps);

    await registerAilments(registry, { ...deps, project: this });

    return registry;
  }

  async detected() {
    try {
      const pkg = await this.requirePackageJson();
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

}
