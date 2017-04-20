import * as path from 'path';

import * as chalk from 'chalk';

import { BowerJson, IProject, PackageJson, ProjectFile, ProjectType } from '../definitions';
import { BaseConfig } from './config';
import { FatalException } from './errors';
import { readBowerJsonFile, readPackageJsonFile } from './utils/npm';
import { prettyPath } from './utils/format';
import { load } from './modules';

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_TYPES: ProjectType[] = ['ionic-angular', 'ionic1'];

export class Project extends BaseConfig<ProjectFile> implements IProject {
  public directory: string;
  protected packageJsonFile?: PackageJson;
  protected bowerJsonFile?: BowerJson;

  async loadAppId(): Promise<string> {
    const p = await this.load();

    if (!p.app_id) {
      throw new FatalException(`Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('app_id')}'. `
                             + `Run '${chalk.bold('ionic link')}'.`);
    }

    return p.app_id;
  }

  async loadPackageJson(): Promise<PackageJson> {
    if (!this.packageJsonFile) {
      const packageJsonPath = path.resolve(this.directory, 'package.json');
      this.packageJsonFile = await readPackageJsonFile(packageJsonPath);
    }

    return this.packageJsonFile;
  }

  async loadBowerJson(): Promise<BowerJson> {
    if (!this.bowerJsonFile) {
      const bowerJsonPath = path.resolve(this.directory, 'bower.json');
      this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
    }

    return this.bowerJsonFile;
  }

  async provideDefaults(o: any): Promise<any> {
    const lodash = load('lodash');
    const results = lodash.cloneDeep(o);

    if (!results.name) {
      results.name = '';
    }

    if (!results.app_id) {
      results.app_id = '';
    }

    if (!results.type) {
      results.type = await this.determineType();
    }

    delete results.projectTypeId;
    delete results.typescript;
    delete results.v2;

    return results;
  }

  async determineType(): Promise<ProjectType> {
    try {
      const packageJson = await this.loadPackageJson();

      if (typeof packageJson.dependencies['ionic-angular'] === 'string') {
        return 'ionic-angular';
      }
    } catch (e) {}

    try {
      const bowerJson = await this.loadBowerJson();

      if ((bowerJson.dependencies && typeof bowerJson.dependencies['ionic'] === 'string') || (bowerJson.devDependencies && typeof bowerJson.devDependencies['ionic'] === 'string')) {
        return 'ionic1';
      }
    } catch (e) {}

    throw new FatalException(`Could not determine project type.\n\n`
                           + `For Ionic Angular projects, make sure 'ionic-angular' exists in the ${chalk.bold('dependencies')} attribute of ${chalk.bold('package.json')}.\n`
                           + `For Ionic 1 projects, make sure 'ionic' exists in the ${chalk.bold('devDependencies')} attribute of ${chalk.bold('bower.json')}.\n\n`
                           + `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold('ionic.config.json')} to one of: ${PROJECT_TYPES.map(v => '\'' + v + '\'').join(', ')}\n`);
  }

  is<ProjectFile>(j: any): j is ProjectFile {
    return typeof j.name === 'string' && typeof j.app_id === 'string';
  }
}
