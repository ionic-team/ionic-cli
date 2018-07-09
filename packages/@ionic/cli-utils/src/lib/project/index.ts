import { BaseConfig, PromptModule, TaskChain } from '@ionic/cli-framework';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_FILE_INVALID_JSON, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';
import { ERROR_INVALID_PACKAGE_JSON, compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/node';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { MULTI_PROJECT_TYPES, PROJECT_FILE, PROJECT_TYPES } from '../../constants';
import { IAilmentRegistry, IClient, IConfig, IIntegration, ILogger, IProject, IProjectConfig, ISession, IShell, InfoItem, IntegrationName, PackageJson, ProjectIntegration, ProjectPersonalizationDetails, ProjectType } from '../../definitions';
import { isMultiProjectConfig, isProjectConfig } from '../../guards';
import * as ζbuild from '../build';
import { FatalException, RunnerNotFoundException } from '../errors';
import * as ζgenerate from '../generate';
import { BaseIntegration } from '../integrations';
import * as ζserve from '../serve';

const debug = Debug('ionic:cli-utils:lib:project');

export async function determineProjectType(projectDir: string, projectName: string | undefined, projectConfig: { [key: string]: any; } | undefined, deps: ProjectDeps): Promise<ProjectType | undefined> {
  let type: ProjectType | undefined;

  if (isProjectConfig(projectConfig)) {
    type = projectConfig.type;
  } else if (isMultiProjectConfig(projectConfig)) {
    const name = projectName ? projectName : projectConfig.defaultProject;

    if (!name) {
      throw new Error(
        `Multi-app workspace detected, but cannot determine which project to use.\n` +
        `Please set a ${chalk.green('defaultProject')} in ${chalk.bold(PROJECT_FILE)} or specify the project using the global ${chalk.green('--project')} option.`
      );
    }

    const config = projectConfig.projects[name];

    if (config) {
      type = config.type;
    } else {
      throw new Error(
        `Multi-app workspace detected, but project was not found in configuration.\n` +
        `Project ${chalk.green(name)} could not be found in the workspace. Did you add it to ${chalk.bold(PROJECT_FILE)}?`
      );
    }

    if (type && !MULTI_PROJECT_TYPES.includes(type)) {
      throw new Error(
        `Multi-app workspace detected, but project is of an unsupported type.\n` +
        `Project type ${chalk.green(type)} is not supported in multi-app workspaces. Please set ${chalk.green(`projects.${name}.type`)} to one of: ${MULTI_PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.`
      );
    }
  }

  if (type && PROJECT_TYPES.includes(type)) {
    debug(`Project type from config: ${chalk.bold(prettyProjectName(type))} ${type ? chalk.bold(`(${type})`) : ''}`);
    return type;
  }

  for (const projectType of PROJECT_TYPES) {
    const p = await createProjectFromType(path.resolve(projectDir, PROJECT_FILE), projectName, deps, projectType);

    if (await p.detected()) {
      debug(`Project type detected: ${chalk.bold(prettyProjectName(p.type))} ${p.type ? chalk.bold(`(${p.type})`) : ''}`);
      return p.type;
    }
  }

  const listWrapOptions = { width: TTY_WIDTH - 8 - 3, indentation: 1 };

  // TODO: move some of this to the CLI docs

  throw new Error(
    `Could not determine project type (project config: ${chalk.bold(prettyPath(path.resolve(projectDir, PROJECT_FILE)))}).\n` +
    `- ${wordWrap(`For ${chalk.bold(prettyProjectName('angular'))} projects, make sure ${chalk.green('@ionic/angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
    `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic-angular'))} projects, make sure ${chalk.green('ionic-angular')} is listed as a dependency in ${chalk.bold('package.json')}.`, listWrapOptions)}\n` +
    `- ${wordWrap(`For ${chalk.bold(prettyProjectName('ionic1'))} projects, make sure ${chalk.green('ionic')} is listed as a dependency in ${chalk.bold('bower.json')}.`, listWrapOptions)}\n\n` +
    `Alternatively, set ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)} to one of: ${PROJECT_TYPES.map(v => chalk.green(v)).join(', ')}.\n\n` +
    `If the Ionic CLI does not know what type of project this is, ${chalk.green('ionic build')}, ${chalk.green('ionic serve')}, and other commands may not work. You can use the ${chalk.green('custom')} project type if that's okay.`
  );
}

export async function createProjectFromType(filePath: string, name: string | undefined, deps: ProjectDeps, type: ProjectType): Promise<IProject> {
  let project: IProject | undefined;

  if (type === 'angular') {
    const { AngularProject } = await import('./angular');
    project = new AngularProject(filePath, name, deps);
  } else if (type === 'ionic-angular') {
    const { IonicAngularProject } = await import('./ionic-angular');
    project = new IonicAngularProject(filePath, name, deps);
  } else if (type === 'ionic1') {
    const { Ionic1Project } = await import('./ionic1');
    project = new Ionic1Project(filePath, name, deps);
  } else if (type === 'custom') {
    const { CustomProject } = await import('./custom');
    project = new CustomProject(filePath, name, deps);
  } else {
    throw new FatalException(`Bad project type: ${chalk.bold(type)}`); // TODO?
  }

  return project;
}

export class ProjectConfig extends BaseConfig<IProjectConfig> {
  provideDefaults(): IProjectConfig {
    return {
      name: 'New Ionic App',
      integrations: {},
    };
  }
}

export interface ProjectDeps {
  readonly client: IClient;
  readonly config: IConfig;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly session: ISession;
  readonly shell: IShell;
  readonly tasks: TaskChain;
}

export abstract class Project implements IProject {
  readonly directory: string;
  abstract readonly type: ProjectType;
  protected originalConfigFile?: { [key: string]: any };

  constructor(
    /**
     * The file path to the configuration file.
     */
    readonly filePath: string,

    /**
     * If provided, this is a multi-app project and will be configured to use
     * the app identified by this string. Otherwise, this is a single-app
     * project.
     */
    readonly name: string | undefined,

    protected readonly e: ProjectDeps
  ) {
    this.directory = path.dirname(filePath);
  }

  get config(): ProjectConfig {
    const options = typeof this.name === 'undefined'
      ? {}
      : { pathPrefix: ['projects', this.name] };

    return new ProjectConfig(this.filePath, options);
  }

  abstract detected(): Promise<boolean>;

  abstract requireBuildRunner(): Promise<ζbuild.BuildRunner<any>>;
  abstract requireServeRunner(): Promise<ζserve.ServeRunner<any>>;
  abstract requireGenerateRunner(): Promise<ζgenerate.GenerateRunner<any>>;

  async getBuildRunner(): Promise<ζbuild.BuildRunner<any> | undefined> {
    try {
      return await this.requireBuildRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async getServeRunner(): Promise<ζserve.ServeRunner<any> | undefined> {
    try {
      return await this.requireServeRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async getGenerateRunner(): Promise<ζgenerate.GenerateRunner<any> | undefined> {
    try {
      return await this.requireGenerateRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async requireProId(): Promise<string> {
    const proId = this.config.get('pro_id');

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
      this.e.log.error(`Error loading ${chalk.bold(pkgName ? pkgName : `project's`)} ${chalk.bold('package.json')}: ${e}`);
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

    this.config.set('name', name);

    const pkg = await this.requirePackageJson();

    pkg.name = projectId;
    pkg.version = version ? version : '0.0.1';
    pkg.description = description ? description : 'An Ionic project';

    await fsWriteJsonFile(this.packageJsonPath, pkg, { encoding: 'utf8' });

    const integrations = await this.getIntegrations();

    await Promise.all(integrations.map(async i => i.personalize(details)));
  }

  async registerAilments(registry: IAilmentRegistry): Promise<void> {
    const ailments = await import('../doctor/ailments');
    const deps = { ...this.e, project: this };

    registry.register(new ailments.NpmInstalledLocally(deps));
    registry.register(new ailments.IonicCLIInstalledLocally(deps));
    registry.register(new ailments.GitNotUsed(deps));
    registry.register(new ailments.GitConfigInvalid(deps));
    registry.register(new ailments.IonicNativeOldVersionInstalled(deps));
    registry.register(new ailments.UnsavedCordovaPlatforms(deps));
    registry.register(new ailments.DefaultCordovaBundleIdUsed(deps));
    registry.register(new ailments.ViewportFitNotSet(deps));
    registry.register(new ailments.CordovaPlatformsCommitted(deps));
  }

  async createIntegration(name: IntegrationName): Promise<IIntegration> {
    return BaseIntegration.createFromName({
      config: this.e.config,
      project: this,
      shell: this.e.shell,
      tasks: this.e.tasks,
    }, name);
  }

  async getIntegration(name: IntegrationName): Promise<Required<ProjectIntegration>> {
    const integration = this.config.get('integrations')[name];

    if (!integration) {
      throw new FatalException(`Could not find ${chalk.bold(name)} integration in the ${chalk.bold(this.name ? this.name : 'default')} project.`);
    }

    return {
      enabled: integration.enabled !== false,
      root: integration.root === undefined ? this.directory : path.resolve(this.directory, integration.root),
    };
  }

  protected async getIntegrations(): Promise<IIntegration[]> {
    const integrations = this.config.get('integrations');
    const names = Object.keys(integrations) as IntegrationName[]; // TODO

    const integrationNames = names.filter(n => {
      const c = integrations[n];
      return c && c.enabled !== false;
    });

    return Promise.all(integrationNames.map(async name => this.createIntegration(name)));
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
