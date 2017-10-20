import * as path from 'path';

import chalk from 'chalk';

import { BowerJson, IProject, PackageJson, ProjectFile, ProjectType } from '../definitions';
import { BaseConfig } from './config';
import { FatalException } from './errors';
import { ERROR_FILE_INVALID_JSON } from '@ionic/cli-framework/utils/fs';
import { ERROR_INVALID_BOWER_JSON, ERROR_INVALID_PACKAGE_JSON, readBowerJsonFile, readPackageJsonFile } from '@ionic/cli-framework/utils/npm';
import { prettyPath } from './utils/format';

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_FILE_LEGACY = 'ionic.project';
export const PROJECT_TYPES: ProjectType[] = ['ionic-angular', 'ionic1', 'custom'];

export class Project extends BaseConfig<ProjectFile> implements IProject {
  public directory: string;
  protected packageJsonFile?: PackageJson;
  protected bowerJsonFile?: BowerJson;

  async loadAppId(): Promise<string> {
    const p = await this.load();

    if (!p.app_id) {
      throw new FatalException(`Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('app_id')}'. `
                             + `Run ${chalk.green('ionic link')}.`);
    }

    return p.app_id;
  }

  async loadPackageJson(): Promise<PackageJson> {
    if (!this.packageJsonFile) {
      const packageJsonPath = path.resolve(this.directory, 'package.json');
      try {
        this.packageJsonFile = await readPackageJsonFile(packageJsonPath);
      } catch (e) {
        if (e === ERROR_FILE_INVALID_JSON) {
          throw new FatalException(`Could not parse ${chalk.bold('package.json')}. Is it a valid JSON file?`);
        } else if (e === ERROR_INVALID_PACKAGE_JSON) {
          throw new FatalException(`The ${chalk.bold('package.json')} file seems malformed.`);
        }

        throw e; // Probably file not found
      }
    }

    return this.packageJsonFile;
  }

  async loadBowerJson(): Promise<BowerJson> {
    if (!this.bowerJsonFile) {
      const bowerJsonPath = path.resolve(this.directory, 'bower.json');
      try {
        this.bowerJsonFile = await readBowerJsonFile(bowerJsonPath);
      } catch (e) {
        if (e === ERROR_FILE_INVALID_JSON) {
          throw new FatalException(`Could not parse ${chalk.bold('bower.json')}. Is it a valid JSON file?`);
        } else if (e === ERROR_INVALID_BOWER_JSON) {
          throw new FatalException(`The ${chalk.bold('bower.json')} file seems malformed.`);
        }

        throw e; // Probably file not found
      }
    }

    return this.bowerJsonFile;
  }

  async provideDefaults(o: any): Promise<any> {
    const cloneDeep = await import('lodash/cloneDeep');
    const results = cloneDeep(o);

    if (!results.name) {
      results.name = '';
    }

    if (!results.app_id) {
      results.app_id = '';
    }

    if (!results.integrations) {
      results.integrations = {};
    }

    if (!results.type) {
      results.type = await this.determineType();
    }

    if (results.gulpFile) {
      results.integrations.gulp = { file: results.gulpFile };
    }

    if (results.gulp && typeof results.gulp.enabled === 'undefined') {
      results.gulp.enabled = true;
    }

    delete results.gulpFile;
    delete results.projectTypeId;
    delete results.typescript;
    delete results.v2;

    return results;
  }

  async getSourceDir(): Promise<string> {
    const project = await this.load();

    if (project.documentRoot) {
      return path.resolve(this.directory, project.documentRoot);
    }

    if (project.type === 'ionic1') {
      return path.resolve(this.directory, 'www');
    }

    return path.resolve(this.directory, 'src');
  }

  is(j: any): j is ProjectFile {
    return j && typeof j.name === 'string' && typeof j.app_id === 'string';
  }

  formatType(type: ProjectType) {
    if (type === 'ionic-angular') {
      return 'Ionic Angular';
    } else if (type === 'ionic1') {
      return 'Ionic 1';
    }

    return type;
  }

  protected async determineType(): Promise<ProjectType> {
    try {
      const packageJson = await this.loadPackageJson();

      if (packageJson.dependencies && typeof packageJson.dependencies['ionic-angular'] === 'string') {
        return 'ionic-angular';
      }
    } catch (e) {
      if (e.fatal) {
        throw e;
      }
    }

    try {
      const bowerJson = await this.loadBowerJson();

      if ((bowerJson.dependencies && typeof bowerJson.dependencies['ionic'] === 'string') || (bowerJson.devDependencies && typeof bowerJson.devDependencies['ionic'] === 'string')) {
        return 'ionic1';
      }
    } catch (e) {
      if (e.fatal) {
        throw e;
      }
    }

    throw new FatalException(
      `Could not determine project type (project config: ${chalk.bold(prettyPath(this.filePath))}).\n` +
      `For ${this.formatType('ionic-angular')} projects, make sure ${chalk.green('ionic-angular')} is listed as a dependency in ${chalk.bold('package.json')}.\n` +
      `For ${this.formatType('ionic1')} projects, make sure ${chalk.green('ionic')} is listed as a dependency in ${chalk.bold('bower.json')}.\n\n` +
      `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold('ionic.config.json')} to one of: ${PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.\n\n` +
      `If the Ionic CLI does not know what type of project this is, ${chalk.green('ionic build')}, ${chalk.green('ionic serve')}, and other commands may not work. You can use the ${chalk.green('custom')} project type if that's okay.\n`
    );
  }
}
