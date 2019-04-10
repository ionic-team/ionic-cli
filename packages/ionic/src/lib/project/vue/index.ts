import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { Project } from '../';
import { InfoItem } from '../../../definitions';
import { RunnerNotFoundException } from '../../errors';

import * as ζbuild from './build';
import * as ζserve from './serve';

const debug = Debug('ionic:lib:project:vue');

export class VueProject extends Project {
  readonly type: 'vue' = 'vue';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ ionicVuePkg, ionicVuePkgPath ],
    ] = await Promise.all([
      this.getPackageJson('@ionic/vue'),
    ]);

    return [
      ...(await super.getInfo()),
      { group: 'ionic', key: 'Ionic Framework', value: ionicVuePkg ? `@ionic/vue ${ionicVuePkg.version}` : 'not installed', path: ionicVuePkgPath },
    ];
  }

  /**
   * We can't detect Vue project types. We don't know what they look like!
   */
  async detected() {
    try {
      const pkg = await this.requirePackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/vue'] === 'string') {
        debug(`${chalk.bold('@ionic/vue')} detected in ${chalk.bold('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async requireBuildRunner(): Promise<ζbuild.VueBuildRunner> {
    const { VueBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new VueBuildRunner(deps);
  }

  async requireServeRunner(): Promise<ζserve.VueServeRunner> {
    const { VueServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new VueServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for Vue projects.\n` +
      `Since you're using the ${chalk.bold('Vue')} project type, this command won't work. The Ionic CLI doesn't know how to generate framework components for Vue projects.`
    );
  }
}
