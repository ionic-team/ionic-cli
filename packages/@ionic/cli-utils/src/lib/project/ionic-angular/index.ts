import * as path from 'path';

import chalk from 'chalk';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { InfoHookItem, ProjectType } from '../../../definitions';

import { BaseProject } from '../';

export class Project extends BaseProject {
  type: ProjectType = 'ionic-angular';

  async getInfo(): Promise<InfoHookItem[]> {
    const [ ionicAngularVersion, appScriptsVersion ] = await Promise.all([this.getFrameworkVersion(), this.getAppScriptsVersion()]);

    return [
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/app-scripts', value: appScriptsVersion ? appScriptsVersion : 'not installed' },
    ];
  }

  async getFrameworkVersion(): Promise<string | undefined> {
    const pkgPath = path.resolve(this.directory, 'node_modules', 'ionic-angular', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }

  async getAppScriptsVersion(): Promise<string | undefined> {
    const pkgPath = path.resolve(this.directory, 'node_modules', '@ionic', 'app-scripts', 'package.json');

    try {
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(pkgPath))} file: ${e}`);
    }
  }
}
