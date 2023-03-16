import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { Project } from '../';
import { InfoItem } from '../../../definitions';
import { RunnerNotFoundException } from '../../errors';

const debug = Debug('ionic:lib:project:vue');

export class ReactViteProject extends Project {
  readonly type: 'react' = 'react';

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ionicReact, ionicReactPath],
    ] = await Promise.all([
      this.getPackageJson('@ionic/react'),
    ]);

    return [
      ...(await super.getInfo()),
      {
        group: 'ionic',
        name: 'Ionic Framework',
        key: 'framework',
        value: ionicReact ? `@ionic/react ${ionicReact.version}` : 'not installed',
        path: ionicReactPath,
      },
    ];
  }

  /**
   * We can't detect Vue project types. We don't know what they look like!
   */
  async detected() {
    try {
      const pkg = await this.requirePackageJson();
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/react'] === 'string') {
        debug(`${chalk.bold('@ionic/react')} detected in ${chalk.bold('package.json')}`);
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  async getDefaultDistDir(): Promise<string> {
    return 'dist';
  }

  async requireBuildRunner(): Promise<import('./build').ReactViteBuildRunner> {
    const { ReactViteBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new ReactViteBuildRunner(deps);
  }

  async requireServeRunner(): Promise<import('./serve').ReactViteServeRunner> {
    const { ReactViteServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new ReactViteServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for React projects.\n` +
      `Since you're using the ${chalk.bold('React')} project type, this command won't work. The Ionic CLI doesn't know how to generate framework components for React projects.`
    );
  }

  setPrimaryTheme(themeColor: string): Promise<void> {
    const themePath = path.join(this.directory, 'src', 'theme', 'variables.css');
    return this.writeThemeColor(themePath, themeColor);
  }
}
