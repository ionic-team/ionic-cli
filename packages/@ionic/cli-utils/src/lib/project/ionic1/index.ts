import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

import { InfoHookItem, ProjectType } from '../../../definitions';

import { BaseProject } from '../';

export class Project extends BaseProject {
  type: ProjectType = 'ionic1';

  async getInfo(): Promise<InfoHookItem[]> {
    const ionic1Version = await this.getFrameworkVersion();

    return [
      { type: 'local-packages', key: 'Ionic Framework', value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' },
    ];
  }

  async getFrameworkVersion(): Promise<string | undefined> {
    const ionicVersionFilePath = path.resolve(this.directory, 'www', 'lib', 'ionic', 'version.json'); // TODO
    const bowerJsonPath = path.resolve(this.directory, 'bower.json');

    try {
      try {
        const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
        return ionicVersionJson['version'];
      } catch (e) {
        this.log.warn(`Error with ${chalk.bold(prettyPath(ionicVersionFilePath))} file: ${e}, trying ${chalk.bold(prettyPath(bowerJsonPath))}.`);

        const bwr = await this.loadBowerJson();
        const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);

        const ionicEntry = deps['ionic'];

        if (!ionicEntry) {
          return;
        }

        const m = ionicEntry.match(/.+#(.+)/);

        if (m && m[1]) {
          return m[1];
        }
      }
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(bowerJsonPath))} file: ${e}`);
    }
  }
}
