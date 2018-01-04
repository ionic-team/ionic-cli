import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';

import { ERROR_FILE_INVALID_JSON, fsReadJsonFile } from '@ionic/cli-framework/utils/fs';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_INVALID_BOWER_JSON, ERROR_INVALID_PACKAGE_JSON, readBowerJsonFile, readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { BowerJson, IProject, ILogger, InfoHookItem, PackageJson, ProjectFile, ProjectType } from '../../definitions';
import { BaseConfig } from '../config';
import { FatalException } from '../errors';

import * as angularProjectLibType from './angular';
import * as ionicAngularProjectLibType from './ionic-angular';
import * as ionic1ProjectLibType from './ionic1';

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_FILE_LEGACY = 'ionic.project';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'ionic-angular', 'ionic1', 'custom'];

export interface ProjectDeps {
  log: ILogger;
};

export abstract class BaseProject extends BaseConfig<ProjectFile> implements IProject {
  type?: ProjectType;
  directory: string;
  protected packageJsonFile?: PackageJson;
  protected bowerJsonFile?: BowerJson;
  protected log: ILogger;

  constructor(dir: string, file: string, { log }: ProjectDeps) {
    super(dir, file);
    this.log = log;
  }

  static async determineType(projectDir: string): Promise<ProjectType | undefined> {
    let pkg: PackageJson | undefined;
    let bwr: BowerJson | undefined;

    try {
      const f = await fsReadJsonFile(path.resolve(projectDir, PROJECT_FILE));

      if (PROJECT_TYPES.includes(f.type)) {
        return f.type;
      }
    } catch (e) {
      // ignore
    }

    try {
      pkg = await readPackageJsonFile(path.resolve(projectDir, 'package.json'));
    } catch (e) {
      // ignore
    }

    if (pkg) {
      const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

      if (typeof deps['@ionic/angular'] === 'string') {
        return 'angular';
      }

      if (typeof deps['ionic-angular'] === 'string') {
        return 'ionic-angular';
      }
    }

    try {
      bwr = await readBowerJsonFile(path.resolve(projectDir, 'bower.json'));
    } catch (e) {
      // ignore
    }

    if (bwr) {
      const deps = lodash.assign({}, bwr.dependencies, bwr.devDependencies);

      if (typeof deps['ionic'] === 'string') {
        return 'ionic1';
      }
    }
  }

  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'angular'): Promise<angularProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'ionic-angular'): Promise<ionicAngularProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'ionic1'): Promise<ionic1ProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: ProjectType): Promise<IProject>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: ProjectType): Promise<IProject> {
    if (type === 'angular') {
      const { Project } = await import('./angular');
      return new Project(dir, file, deps);
    } else if (type === 'ionic-angular') {
      const { Project } = await import('./ionic-angular');
      return new Project(dir, file, deps);
    } else if (type === 'ionic1') {
      const { Project } = await import('./ionic1');
      return new Project(dir, file, deps);
    }

    throw new FatalException(`Bad project type: ${chalk.bold(type)}`); // TODO?
  }

  async loadAppId(): Promise<string> {
    const p = await this.load();

    if (!p.app_id) {
      throw new FatalException(
        `Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('app_id')}'. ` +
        `Run ${chalk.green('ionic link')}.`
      );
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
    const results = lodash.cloneDeep(o);

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
      results.type = this.type;
    }

    delete results.integrations.gulp;
    delete results.gulp;
    delete results.projectTypeId;
    delete results.typescript;
    delete results.v2;

    return results;
  }

  is(j: any): j is ProjectFile {
    return j && typeof j.name === 'string' && typeof j.app_id === 'string';
  }

  abstract getInfo(): Promise<InfoHookItem[]>;

  async getSourceDir(): Promise<string> {
    const project = await this.load();

    if (project.documentRoot) {
      return path.resolve(this.directory, project.documentRoot);
    }

    if (this.type === 'ionic1') {
      return path.resolve(this.directory, 'www');
    }

    return path.resolve(this.directory, 'src');
  }
}

export class OutsideProject extends BaseConfig<never> implements IProject {
  type = undefined;

  is(j: any): j is never {
    return false;
  }

  private _createError() {
    const listWrapOptions = { width: TTY_WIDTH - 8 - 3, indentation: 1 };

    // TODO: move some of this to the website

    return new FatalException(
      `Could not determine project type (project config: ${chalk.bold(prettyPath(this.filePath))}).\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('angular'))} projects, make sure ${chalk.green('@ionic/angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic-angular'))} projects, make sure ${chalk.green('ionic-angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic1'))} projects, make sure ${chalk.green('ionic')} is listed as a dependency in ${chalk.bold('bower.json')}.`, listWrapOptions)}\n\n` +
      `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)} to one of: ${PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.\n\n` +
      `If the Ionic CLI does not know what type of project this is, ${chalk.green('ionic build')}, ${chalk.green('ionic serve')}, and other commands may not work. You can use the ${chalk.green('custom')} project type if that's okay.\n`
    );
  }

  async getInfo(): Promise<InfoHookItem[]> {
    return [];
  }

  async getSourceDir(): Promise<never> {
    throw this._createError();
  }

  async loadAppId(): Promise<never> {
    throw this._createError();
  }

  async loadPackageJson(): Promise<never> {
    throw this._createError();
  }

  async loadBowerJson(): Promise<never> {
    throw this._createError();
  }

  async provideDefaults(o: any): Promise<never> {
    throw this._createError();
  }
}

export function prettyProjectName(type: ProjectType): string {
  if (type === 'angular') {
    return 'Ionic Angular v4+';
  } else if (type === 'ionic-angular') {
    return 'Ionic Angular v2/v3';
  } else if (type === 'ionic1') {
    return 'Ionic 1';
  }

  return type;
}
