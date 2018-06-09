import { TaskChain } from '@ionic/cli-framework';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_FILE_INVALID_JSON, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import {
  ERROR_INVALID_PACKAGE_JSON,
  compileNodeModulesPaths,
  readPackageJsonFile,
  resolve,
} from '@ionic/cli-framework/utils/npm';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';
import { FatalError } from 'tslint/lib/error';

import { ProjectConfig } from '../..';
import { PROJECT_FILE, PROJECT_TYPES } from '../../constants';
import {
  IAilmentRegistry,
  IConfig,
  IIntegration,
  ILogger,
  IProject,
  IShell,
  InfoItem,
  IntegrationName,
  PackageJson,
  ProjectFile,
  ProjectIntegration,
  ProjectPersonalizationDetails,
  ProjectType,
} from '../../definitions';
import { isMultiProjectConfig, isProjectConfig } from '../../guards';
import { BaseConfig } from '../config';
import * as ζdoctor from '../doctor';
import { FatalException } from '../errors';
import { BaseIntegration } from '../integrations';

import * as ζangular from './angular';
import * as ζcustom from './custom';
import * as ζionicAngular from './ionic-angular';
import * as ζionic1 from './ionic1';

const debug = Debug('ionic:cli-utils:lib:project');

export interface ProjectDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly shell: IShell;
  readonly tasks: TaskChain;
}

export abstract class Project extends BaseConfig<ProjectConfig> implements IProject {
  abstract readonly type: ProjectType;

  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly shell: IShell;
  protected readonly tasks: TaskChain;

  constructor(dir: string, file: string, name: string | undefined, { config, log, shell, tasks }: ProjectDeps) {
    super(dir, file, name);
    this.config = config;
    this.log = log;
    this.shell = shell;
    this.tasks = tasks;
  }

  static async determineType(projectDir: string, projectName: string | undefined, projectConfig: ProjectFile, deps: ProjectDeps): Promise<ProjectType | undefined> {
    let type: ProjectType | undefined;

    if (isProjectConfig(projectConfig)) {
      type = projectConfig.type;
    }

    if (isMultiProjectConfig(projectConfig)) {
      type = projectConfig.projects[projectName ? projectName : projectConfig.defaultProject].type;
    }

    if (type && PROJECT_TYPES.includes(type)) {
      debug(`Project type from config: ${chalk.bold(prettyProjectName(type))} ${type ? chalk.bold(`(${type})`) : ''}`);
      return type;
    }

    for (const projectType of PROJECT_TYPES) {
      const p = await Project.createFromProjectType(projectDir, PROJECT_FILE, projectName, deps, projectType);

      if (await p.detected()) {
        debug(`Project type detected: ${chalk.bold(prettyProjectName(p.type))} ${p.type ? chalk.bold(`(${p.type})`) : ''}`);
        return p.type;
      }
    }

    const listWrapOptions = { width: TTY_WIDTH - 8 - 3, indentation: 1 };

    // TODO: move some of this to the CLI docs

    deps.log.error(
      `Could not determine project type (project config: ${chalk.bold(prettyPath(path.resolve(projectDir, PROJECT_FILE)))}).\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('angular'))} projects, make sure ${chalk.green('@ionic/angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic-angular'))} projects, make sure ${chalk.green('ionic-angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
      `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic1'))} projects, make sure ${chalk.green('ionic')} is listed as a dependency in ${chalk.bold('bower.json')}.`, listWrapOptions)}\n\n` +
      `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)} to one of: ${PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.\n\n` +
      `If the Ionic CLI does not know what type of project this is, ${chalk.green('ionic build')}, ${chalk.green('ionic serve')}, and other commands may not work. You can use the ${chalk.green('custom')} project type if that's okay.`
    );
  }

  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: 'angular'): Promise<ζangular.AngularProject>;
  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: 'ionic-angular'): Promise<ζionicAngular.IonicAngularProject>;
  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: 'ionic1'): Promise<ζionic1.Ionic1Project>;
  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: 'custom'): Promise<ζcustom.CustomProject>;
  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: ProjectType): Promise<IProject>;
  static async createFromProjectType(dir: string, file: string, name: string | undefined, deps: ProjectDeps, type: ProjectType): Promise<IProject> {
    let project: IProject | undefined;

    if (type === 'angular') {
      const { AngularProject } = await import('./angular');

      if (name === undefined) {
        // We need a defaultProject or --project flag set for angular projects.
        throw new FatalException(`Please set a ${chalk.red('defaultProject')} in ${chalk.red(PROJECT_FILE)} or specify the project using ${chalk.green('--project')}`);
      }

      project = new AngularProject(dir, file, name, deps);
    } else if (type === 'ionic-angular') {
      const { IonicAngularProject } = await import('./ionic-angular');
      project = new IonicAngularProject(dir, file, name, deps);
    } else if (type === 'ionic1') {
      const { Ionic1Project } = await import('./ionic1');
      project = new Ionic1Project(dir, file, name, deps);
    } else if (type === 'custom') {
      const { CustomProject } = await import('./custom');
      project = new CustomProject(dir, file, name, deps);
    } else {
      throw new FatalException(`Bad project type: ${chalk.bold(type)}`); // TODO?
    }

    return project;
  }

  abstract detected(): Promise<boolean>;

  async requireProId(): Promise<string> {
    const p = await this.load();
    const proId = p.pro_id;

    if (!proId) {
      throw new FatalException(
        `Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('pro_id')}'. ` +
        `Run ${chalk.green('ionic link')}.`
      );
    }

    return proId;
  }

  get packageJsonPath() {
    return path.resolve(this.directory, 'package.json');
  }

  async getPackageJson(pkgName?: string): Promise<[PackageJson | undefined, string | undefined]> {
    let pkg: PackageJson | undefined;
    let pkgPath: string | undefined;

    try {
      pkgPath = pkgName ? resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
      pkg = await readPackageJsonFile(pkgPath);
    } catch (e) {
      this.log.error(`Error loading ${chalk.bold(pkgName ? pkgName : `project's`)} ${chalk.bold('package.json')}: ${e}`);
    }

    return [pkg, pkgPath ? path.dirname(pkgPath) : undefined];
  }

  async requirePackageJson(pkgName?: string): Promise<PackageJson> {
    try {
      const pkgPath = pkgName ? resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
      return await readPackageJsonFile(pkgPath);
    } catch (e) {
      if (e === ERROR_FILE_INVALID_JSON) {
        throw new FatalException(`Could not parse ${chalk.bold(pkgName ? pkgName : `project's`)} ${chalk.bold('package.json')}. Is it a valid JSON file?`);
      } else if (e === ERROR_INVALID_PACKAGE_JSON) {
        throw new FatalException(`The ${chalk.bold(pkgName ? pkgName : `project's`)} ${chalk.bold('package.json')} file seems malformed.`);
      }

      throw e; // Probably file not found
    }
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

  is(j: any): j is ProjectConfig {
    return j
      && typeof j.name === 'string'
      && typeof j.integrations === 'object';
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ionicframework.com/docs';
  }

  async getSourceDir(sourceRoot = 'src'): Promise<string> {
    return path.resolve(this.directory, sourceRoot);
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

  async getAilmentRegistry(deps: ζdoctor.AilmentDeps): Promise<IAilmentRegistry> {
    const { AilmentRegistry, registerAilments } = await import('../doctor/ailments');

    const registry = new AilmentRegistry();

    await registerAilments(registry, deps);

    return registry;
  }

  async createIntegration(name: IntegrationName): Promise<IIntegration> {
    return BaseIntegration.createFromName({
      config: this.config,
      project: this,
      shell: this.shell,
      tasks: this.tasks,
    }, name);
  }

  async getIntegration(name: IntegrationName): Promise<ProjectIntegration> {
    if (!this.configFile) {
      throw new FatalError(`Tried to get integration before loading config file`);
    }

    const integration = this.configFile.integrations[name];

    if (!integration) {
      throw new FatalException(`Could not find ${chalk.red(name)} integration in the ${chalk.red(this.name ? this.name : 'default')} project.`);
    }

    return {
      enabled: integration.enabled === undefined ? false : integration.enabled,
      root: integration.root === undefined ? path.resolve('.') : integration.root,
    };
  }

  async load(options: { disk?: boolean; } = {}): Promise<ProjectConfig> {
    let config = await super.load(options);

    if (isMultiProjectConfig(config) && this.name) {
      config = config.projects[this.name];
    }

    this.configFile = config;

    return this.configFile;
  }

  async save(config?: ProjectConfig): Promise<void> {
    if (!config) {
      config = this.configFile;
    }

    if (config) {
      if (isMultiProjectConfig(this.originalConfigFile)) {
        if (this.name && !lodash.isEqual(config, this.originalConfigFile.projects[this.name])) {
          const saveConfig = lodash.cloneDeep(this.originalConfigFile);

          saveConfig.projects[this.name] = config;

          await fsWriteJsonFile(this.filePath, saveConfig, { encoding: 'utf8' });

          this.configFile = config;
          this.originalConfigFile = saveConfig;
        }
      } else {
        await super.save(config);
      }
    }
  }

  protected async getIntegrations(): Promise<IIntegration[]> {
    const p = await this.load();
    const projectIntegrations = Object.keys(p.integrations) as IntegrationName[]; // TODO

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
  readonly type = undefined;

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
  async getPackageJson(): Promise<never> { throw this._createError(); }
  async provideDefaults(): Promise<never> { throw this._createError(); }
  async personalize(): Promise<never> { throw this._createError(); }
  async getAilmentRegistry(): Promise<never> { throw this._createError(); }
  async createIntegration(): Promise<never> { throw this._createError(); }
  async getIntegration(): Promise<never> { throw this._createError(); }
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
