import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { Project } from '../';
import { InfoItem } from '../../../definitions';
import { RunnerNotFoundException } from '../../errors';

import * as ζbuild from './build';
import * as ζserve from './serve';

const debug = Debug('ionic:lib:project:React');

export class ReactProject extends Project {
  readonly type: 'react' = 'react';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ ionicReactPkg, ionicReactPkgPath ],
    ] = await Promise.all([
      this.getPackageJson('@ionic/react'),
    ]);

    return [
      ...(await super.getInfo()),
      { group: 'ionic', key: 'Ionic Framework', value: ionicReactPkg ? `@ionic/react ${ionicReactPkg.version}` : 'not installed', path: ionicReactPkgPath },
    ];
  }

  /**
   * We can't detect React project types. We don't know what they look like!
   */
  async detected() {
    try {
      const pkg = await this.requirePackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/React'] === 'string') {
        debug(`${chalk.bold('@ionic/React')} detected in ${chalk.bold('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async requireBuildRunner(): Promise<ζbuild.ReactBuildRunner> {
    const { ReactBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new ReactBuildRunner(deps);
  }

  async requireServeRunner(): Promise<ζserve.ReactServeRunner> {
    const { ReactServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new ReactServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for React projects.\n` +
      `Since you're using the ${chalk.bold('React')} project type, this command won't work. The Ionic CLI doesn't know how to generate framework components for React projects.`
    );
  }
}
