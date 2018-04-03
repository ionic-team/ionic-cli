import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { prettyPath } from '@ionic/cli-framework/utils/format';
import { fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';

import { IAilmentRegistry, InfoItem, ProjectPersonalizationDetails, ProjectType } from '../../../definitions';

import { BaseProject } from '../';
import { ANGULAR_CLI_FILE, readAngularCLIJsonFile } from './utils';
import * as doctorLibType from '../../doctor';

const debug = Debug('ionic:cli-utils:lib:project:angular');

export class Project extends BaseProject {
  type: ProjectType = 'angular';

  async getInfo(): Promise<InfoItem[]> {
    const [
      ionicAngularVersion,
      ionicCoreVersion,
      ionicSchematicsAngularVersion,
      angularCLIVersion,
      angularDevKitCoreVersion,
      angularDevKitSchematicsVersion,
    ] = await Promise.all([
      this.getPackageVersion('@ionic/angular'),
      this.getPackageVersion('@ionic/core'),
      this.getPackageVersion('@ionic/schematics-angular'),
      this.getPackageVersion('@angular/cli'),
      this.getPackageVersion('@angular-devkit/core'),
      this.getPackageVersion('@angular-devkit/schematics'),
    ]);

    return [
      ...(await super.getInfo()),
      { type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `@ionic/angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', key: '@ionic/core', value: ionicCoreVersion ? ionicCoreVersion : 'not installed' },
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

  async personalize(details: ProjectPersonalizationDetails) {
    await super.personalize(details);

    const { name } = details;
    const angularJsonPath = path.resolve(this.directory, ANGULAR_CLI_FILE);

    try {
      const angularJson = await readAngularCLIJsonFile(angularJsonPath);
      angularJson.project.name = name;

      await fsWriteJsonFile(angularJsonPath, angularJson, { encoding: 'utf8' });
    } catch (e) {
      this.log.error(`Error with ${chalk.bold(prettyPath(angularJsonPath))} file: ${e}`);
    }
  }

  async getAilmentRegistry(deps: doctorLibType.AutomaticallyTreatableAilmentDeps): Promise<IAilmentRegistry> {
    const { registerAilments } = await import('./ailments');

    const registry = await super.getAilmentRegistry(deps);

    registerAilments(registry, { ...deps, project: this });

    return registry;
  }
}
