import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { ERROR_FILE_INVALID_JSON, fsReadJsonFile, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_INVALID_PACKAGE_JSON, readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

import { IAilmentRegistry, IIntegration, ILogger, IProject, IShell, InfoHookItem, IntegrationName, PackageJson, ProjectFile, ProjectPersonalizationDetails, ProjectType } from '../../definitions';
import { BaseConfig } from '../config';
import { FatalException } from '../errors';
import { BaseIntegration } from '../integrations';

import * as doctorLibType from '../doctor';

import * as angularProjectLibType from './angular';
import * as ionicAngularProjectLibType from './ionic-angular';
import * as ionic1ProjectLibType from './ionic1';
import * as customProjectLibType from './custom';

const debug = Debug('ionic:cli-utils:lib:project');

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

    if (projectFile && projectFile.type && PROJECT_TYPES.includes(projectFile.type)) {
      debug(`Project type from config: ${chalk.bold(prettyProjectName(projectFile.type))} ${projectFile.type ? chalk.bold(`(${projectFile.type})`) : ''}`);
      return projectFile.type;
    }

    for (const projectType of PROJECT_TYPES) {
      const p = await BaseProject.createFromProjectType(projectDir, PROJECT_FILE, deps, projectType);

      if (await p.detected()) {
        debug(`Project type detected: ${chalk.bold(prettyProjectName(p.type))} ${p.type ? chalk.bold(`(${p.type})`) : ''}`);
        return p.type;
      }
    }

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
    } else {
      throw new FatalException(`Bad project type: ${chalk.bold(type)}`); // TODO?
    }

    await project.refreshIntegrations();

    return project;
  }

  async refreshIntegrations() {
    const p = await this.load();
    const projectIntegrations = <IntegrationName[]>Object.keys(p.integrations); // TODO

    const integrationNames = projectIntegrations.filter(n => {
      const i = p.integrations[n];
      return i && i.enabled !== false;
    });

    this.integrations = await Promise.all(integrationNames.map(async name => BaseIntegration.createFromName({ project: this, shell: this.shell }, name)));
  }

  abstract detected(): Promise<boolean>;

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

  get packageJsonPath() {
    return path.resolve(this.directory, 'package.json');
  }

  async loadPackageJson(): Promise<PackageJson> {
    if (!this.packageJsonFile) {
      try {
        this.packageJsonFile = await readPackageJsonFile(this.packageJsonPath);
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

  async getSourceDir(): Promise<string> {
    const project = await this.load();

    if (project.documentRoot) {
      return path.resolve(this.directory, project.documentRoot);
    }

    return path.resolve(this.directory, 'src');
  }

  async personalize(details: ProjectPersonalizationDetails) {
    const { appName, displayName, description, version } = details;

    const project = await this.load();
    project.name = displayName ? displayName : appName;
    await this.save();

    const pkg = await this.loadPackageJson();

    pkg.name = appName;
    pkg.version = version ? version : '0.0.1';
    pkg.description = description ? description : 'An Ionic project';

    await fsWriteJsonFile(this.packageJsonPath, pkg, { encoding: 'utf8' });

    await Promise.all(this.integrations.map(async i => i.personalize(details)));
  }

  async getAilmentRegistry(deps: doctorLibType.AutomaticallyTreatableAilmentDeps): Promise<IAilmentRegistry> {
    const { AilmentRegistry, registerAilments } = await import('../doctor/ailments');

    const registry = new AilmentRegistry();

    registerAilments(registry, deps);

    return registry;
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

  async provideDefaults(): Promise<never> {
    throw this._createError();
  }

  async personalize(): Promise<never> {
    throw this._createError();
  }

  async refreshIntegrations(): Promise<never> {
    throw this._createError();
  }

  async getAilmentRegistry(): Promise<never> {
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
