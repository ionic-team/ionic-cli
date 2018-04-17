import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { ERROR_FILE_INVALID_JSON, fsReadJsonFile, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_INVALID_PACKAGE_JSON, compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/npm';

import { IAilmentRegistry, IConfig, IIntegration, ILogger, IProject, IShell, ITaskChain, InfoItem, IntegrationName, PackageJson, ProjectFile, ProjectPersonalizationDetails, ProjectType } from '../../definitions';
import { PROJECT_FILE, PROJECT_TYPES } from '../../constants';
import { BaseConfig } from '../config';
import { FatalException } from '../errors';
import { BaseIntegration } from '../integrations';

import * as doctorLibType from '../doctor';

import * as angularProjectLibType from './angular';
import * as ionicAngularProjectLibType from './ionic-angular';
import * as ionic1ProjectLibType from './ionic1';
import * as customProjectLibType from './custom';

const debug = Debug('ionic:cli-utils:lib:project');

export interface ProjectDeps {
  config: IConfig;
  log: ILogger;
  shell: IShell;
  tasks: ITaskChain;
}

export abstract class BaseProject extends BaseConfig<ProjectFile> implements IProject {
  type?: ProjectType;

  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly shell: IShell;
  protected readonly tasks: ITaskChain;

  protected packageJsonFile?: PackageJson;

  constructor(dir: string, file: string, { config, log, shell, tasks }: ProjectDeps) {
    super(dir, file);
    this.config = config;
    this.log = log;
    this.shell = shell;
    this.tasks = tasks;
  }

  static async determineType(projectDir: string, deps: ProjectDeps): Promise<ProjectType | undefined> {
    const projectFilePath = path.resolve(projectDir, PROJECT_FILE);
    let projectFile: { [key: string]: any; } | undefined;

    try {
      projectFile = await fsReadJsonFile(projectFilePath);
    } catch (e) {
      debug('Attempted to load project config %s but got error: %O', projectFilePath, e);
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

    return project;
  }

  abstract detected(): Promise<boolean>;

  async requireProId(): Promise<string> {
    const p = await this.load();

    if (!p.pro_id) {
      throw new FatalException(
        `Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('pro_id')}'. ` +
        `Run ${chalk.green('ionic link')}.`
      );
    }

    return p.pro_id;
  }

  get packageJsonPath() {
    return path.resolve(this.directory, 'package.json');
  }

  async requirePackageJson(): Promise<PackageJson> {
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

    if (results.app_id) {
      results.pro_id = results.app_id;
    }

    if (!results.integrations) {
      results.integrations = {};
    }

    if (!results.type) {
      results.type = this.type;
    }

    delete results.app_id;
    delete results.integrations.gulp;
    delete results.gulp;
    delete results.projectTypeId;
    delete results.typescript;
    delete results.v2;

    return results;
  }

  is(j: any): j is ProjectFile {
    return j
      && typeof j.name === 'string'
      && typeof j.integrations === 'object';
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ionicframework.com/docs';
  }

  async getSourceDir(): Promise<string> {
    return path.resolve(this.directory, 'src');
  }

  async getDistDir(): Promise<string> {
    return path.resolve(this.directory, 'www');
  }

  async getInfo(): Promise<InfoItem[]> {
    const integrations = await this.getIntegrations();
    const integrationInfo = lodash.flatten(await Promise.all(integrations.map(async i => i.getInfo())));

    return integrationInfo;
  }

  async personalize(details: ProjectPersonalizationDetails): Promise<void> {
    const { name, projectId, description, version } = details;

    const project = await this.load();
    project.name = name;
    await this.save();

    const pkg = await this.requirePackageJson();

    pkg.name = projectId;
    pkg.version = version ? version : '0.0.1';
    pkg.description = description ? description : 'An Ionic project';

    await fsWriteJsonFile(this.packageJsonPath, pkg, { encoding: 'utf8' });

    const integrations = await this.getIntegrations();

    await Promise.all(integrations.map(async i => i.personalize(details)));
  }

  async getAilmentRegistry(deps: doctorLibType.AilmentDeps): Promise<IAilmentRegistry> {
    const { AilmentRegistry, registerAilments } = await import('../doctor/ailments');

    const registry = new AilmentRegistry();

    registerAilments(registry, deps);

    return registry;
  }

  async getPackageVersion(pkgName: string) {
    try {
      const pkgPath = resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) });
      const pkg = await readPackageJsonFile(pkgPath);
      return pkg.version;
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName)} package: ${e}`);
    }
  }

  async createIntegration(name: IntegrationName): Promise<IIntegration> {
    return BaseIntegration.createFromName({
      config: this.config,
      project: this,
      shell: this.shell,
      tasks: this.tasks,
    }, name);
  }

  protected async getIntegrations(): Promise<IIntegration[]> {
    const p = await this.load();
    const projectIntegrations = <IntegrationName[]>Object.keys(p.integrations); // TODO

    const integrationNames = projectIntegrations.filter(n => {
      const c = p.integrations[n];
      return c && c.enabled !== false;
    });

    return Promise.all(integrationNames.map(async name => this.createIntegration(name)));
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

  is(j: any): j is never {
    return false;
  }

  private _createError() {
    return new FatalException(
      `Attempted to load an Ionic project outside a detected project directory.\n` +
      `Would you mind reporting this issue? ${chalk.bold('https://github.com/ionic-team/ionic-cli/issues/')}`
    );
  }

  async detected() {
    return true;
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ionicframework.com/docs';
  }

  async getInfo(): Promise<InfoItem[]> {
    return [];
  }

  async getSourceDir(): Promise<never> { throw this._createError(); }
  async getDistDir(): Promise<never> { throw this._createError(); }
  async requireProId(): Promise<never> { throw this._createError(); }
  async requirePackageJson(): Promise<never> { throw this._createError(); }
  async provideDefaults(): Promise<never> { throw this._createError(); }
  async personalize(): Promise<never> { throw this._createError(); }
  async getAilmentRegistry(): Promise<never> { throw this._createError(); }
  async createIntegration(): Promise<never> { throw this._createError(); }
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
