import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';

import { ERROR_FILE_INVALID_JSON, fsReadJsonFile } from '@ionic/cli-framework/utils/fs';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_INVALID_PACKAGE_JSON, readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { IIntegration, ILogger, IProject, IShell, InfoHookItem, IntegrationName, PackageJson, ProjectFile, ProjectType } from '../../definitions';
import { BaseConfig } from '../config';
import { FatalException } from '../errors';
import { BaseIntegration } from '../integrations';

import * as angularProjectLibType from './angular';
import * as ionicAngularProjectLibType from './ionic-angular';
import * as ionic1ProjectLibType from './ionic1';
import * as customProjectLibType from './custom';

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_FILE_LEGACY = 'ionic.project';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'ionic-angular', 'ionic1', 'custom'];

export interface ProjectDeps {
  log: ILogger;
  shell: IShell;
}

export abstract class BaseProject extends BaseConfig<ProjectFile> implements IProject {
  type?: ProjectType;
  integrations: IIntegration[] = [];
  directory: string;
  protected packageJsonFile?: PackageJson;
  protected log: ILogger;
  protected shell: IShell;

  constructor(dir: string, file: string, { log, shell }: ProjectDeps) {
    super(dir, file);
    this.log = log;
    this.shell = shell;
  }

  static async determineType(projectDir: string, deps: ProjectDeps): Promise<ProjectType | undefined> {
    const projectFilePath = path.resolve(projectDir, PROJECT_FILE);
    let projectFile: { [key: string]: any; } | undefined;

    try {
      projectFile = await fsReadJsonFile(projectFilePath);
    } catch (e) {
      // ignore
    }

    if (projectFile) {
      if (PROJECT_TYPES.includes(projectFile.type)) {
        return projectFile.type;
      } else {
        const listWrapOptions = { width: TTY_WIDTH - 8 - 3, indentation: 1 };

        // TODO: move some of this to the CLI docs

        deps.log.error(
          `Could not determine project type (project config: ${chalk.bold(prettyPath(projectFilePath))}).\n` +
          `- ${wordWrap(`For ${chalk.bold(prettyProjectName('angular'))} projects, make sure ${chalk.green('@ionic/angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
          `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic-angular'))} projects, make sure ${chalk.green('ionic-angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
          `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic1'))} projects, make sure ${chalk.green('ionic')} is listed as a dependency in ${chalk.bold('bower.json')}.`, listWrapOptions)}\n\n` +
          `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)} to one of: ${PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.\n\n` +
          `If the Ionic CLI does not know what type of project this is, ${chalk.green('ionic build')}, ${chalk.green('ionic serve')}, and other commands may not work. You can use the ${chalk.green('custom')} project type if that's okay.`
        );
      }
    }

    for (const projectType of PROJECT_TYPES) {
      const p = await BaseProject.createFromProjectType(projectDir, PROJECT_FILE, deps, projectType);

      if (await p.detected()) {
        return p.type;
      }
    }
  }

  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'angular'): Promise<angularProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'ionic-angular'): Promise<ionicAngularProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'ionic1'): Promise<ionic1ProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: 'custom'): Promise<customProjectLibType.Project>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: ProjectType): Promise<IProject>;
  static async createFromProjectType(dir: string, file: string, deps: ProjectDeps, type: ProjectType): Promise<IProject> {
    let project: IProject | undefined;

    if (type === 'angular') {
      const { Project } = await import('./angular');
      project = new Project(dir, file, deps);
    } else if (type === 'ionic-angular') {
      const { Project } = await import('./ionic-angular');
      project = new Project(dir, file, deps);
    } else if (type === 'ionic1') {
      const { Project } = await import('./ionic1');
      project = new Project(dir, file, deps);
    } else if (type === 'custom') {
      const { Project } = await import('./custom');
      project = new Project(dir, file, deps);
    }

    if (!project) {
      throw new FatalException(`Bad project type: ${chalk.bold(type)}`); // TODO?
    }

    const p = await project.load();

    const integrationNames = <IntegrationName[]>Object.keys(p.integrations); // TODO
    project.integrations.push(...(await Promise.all(integrationNames.map(async name => BaseIntegration.createFromName(deps, name)))));

    return project;
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

  async getInfo(): Promise<InfoHookItem[]> {
    return lodash.flatten(await Promise.all(this.integrations.map(async i => i.getInfo())));
  }

  abstract detected(): Promise<boolean>;

  async getSourceDir(): Promise<string> {
    const project = await this.load();

    if (project.documentRoot) {
      return path.resolve(this.directory, project.documentRoot);
    }

    return path.resolve(this.directory, 'src');
  }
}

/**
 * This is a gross hack.
 *
 * TODO: minimize IonicEnvironment & `env.project.directory` usage, make
 * `env.project` undefined when outside a project.
 */
export class OutsideProject extends BaseConfig<never> implements IProject {
  type = undefined;
  integrations = [];

  is(j: any): j is never {
    return false;
  }

  private _createError() {
    return new FatalException(
      `Attempted to load an Ionic project outside a detected project directory.` +
      `Would you mind reporting this issue? ${chalk.bold('https://github.com/ionic-team/ionic-cli/issues/')}`
    );
  }

  async detected() {
    return true;
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

  async provideDefaults(o: any): Promise<never> {
    throw this._createError();
  }
}

export function prettyProjectName(type?: string): string {
  if (!type) {
    return 'Unknown';
  }

  if (type === 'angular') {
    return 'Ionic Angular v4+';
  } else if (type === 'ionic-angular') {
    return 'Ionic Angular v2/v3';
  } else if (type === 'ionic1') {
    return 'Ionic 1';
  }

  return type;
}
