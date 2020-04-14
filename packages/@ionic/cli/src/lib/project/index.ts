import { BaseConfig, BaseConfigOptions, PackageJson, ParsedArgs } from '@ionic/cli-framework';
import { PromptModule } from '@ionic/cli-framework-prompts';
import { resolveValue } from '@ionic/cli-framework/utils/fn';
import { TTY_WIDTH, prettyPath, wordWrap } from '@ionic/cli-framework/utils/format';
import { ERROR_INVALID_PACKAGE_JSON, compileNodeModulesPaths, isValidPackageName, readPackageJsonFile } from '@ionic/cli-framework/utils/node';
import { ensureDir, findBaseDirectory, readFile, writeFile, writeJson } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { PROJECT_FILE, PROJECT_TYPES } from '../../constants';
import { IAilmentRegistry, IClient, IConfig, IIntegration, ILogger, IMultiProjectConfig, IProject, IProjectConfig, ISession, IShell, InfoItem, IntegrationName, IonicContext, IonicEnvironmentFlags, ProjectIntegration, ProjectPersonalizationDetails, ProjectType } from '../../definitions';
import { isMultiProjectConfig, isProjectConfig } from '../../guards';
import { ancillary, failure, input, strong } from '../color';
import { BaseException, FatalException, IntegrationNotFoundException, RunnerNotFoundException } from '../errors';
import { BaseIntegration } from '../integrations';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from '../integrations/capacitor/config';
import { Color } from '../utils/color';

const debug = Debug('ionic:lib:project');

export interface ProjectDetailsResultBase {
  readonly type?: ProjectType;
  readonly errors: readonly ProjectDetailsError[];
}

export interface ProjectDetailsSingleAppResult extends ProjectDetailsResultBase {
  readonly context: 'app';
}

export interface ProjectDetailsMultiAppResult extends ProjectDetailsResultBase {
  readonly context: 'multiapp';
  readonly id?: string;
}

export interface ProjectDetailsUnknownResult extends ProjectDetailsResultBase {
  readonly context: 'unknown';
}

export type ProjectDetailsResult = (ProjectDetailsSingleAppResult | ProjectDetailsMultiAppResult | ProjectDetailsUnknownResult) & { readonly configPath: string; };

export type ProjectDetailsErrorCode = 'ERR_INVALID_PROJECT_FILE' | 'ERR_INVALID_PROJECT_TYPE' | 'ERR_MISSING_PROJECT_TYPE' | 'ERR_MULTI_MISSING_CONFIG' | 'ERR_MULTI_MISSING_ID';

export class ProjectDetailsError extends BaseException {
  constructor(
    msg: string,

    /**
     * Unique code for this error.
     */
    readonly code: ProjectDetailsErrorCode,

    /**
     * The underlying error that caused this error.
     */
    readonly error?: Error
  ) {
    super(msg);
  }
}

export interface ProjectDetailsDeps {
  readonly rootDirectory: string;
  readonly args?: ParsedArgs;
  readonly e: ProjectDeps;
}

export class ProjectDetails {
  readonly rootDirectory: string;

  protected readonly e: ProjectDeps;
  protected readonly args: ParsedArgs;

  constructor({ rootDirectory, args = { _: [] }, e }: ProjectDetailsDeps) {
    this.rootDirectory = rootDirectory;
    this.e = e;
    this.args = args;
  }

  async getIdFromArgs(): Promise<string | undefined> {
    const id = this.args && this.args['project'] ? String(this.args['project']) : undefined;

    if (id) {
      debug(`Project id from args: ${strong(id)}`);
      return id;
    }
  }

  async getIdFromPathMatch(config: IMultiProjectConfig): Promise<string | undefined> {
    const { ctx } = this.e;

    for (const [key, value] of lodash.entries(config.projects)) {
      const id = key;

      if (value && value.root) {
        const projectDir = path.resolve(this.rootDirectory, value.root);

        if (ctx.execPath.startsWith(projectDir)) {
          debug(`Project id from path match: ${strong(id)}`);
          return id;
        }
      }
    }
  }

  async getIdFromDefaultProject(config: IMultiProjectConfig): Promise<string | undefined> {
    const id = config.defaultProject;

    if (id) {
      debug(`Project id from defaultProject: ${strong(id)}`);
      return id;
    }
  }

  async getTypeFromConfig(config: IProjectConfig): Promise<ProjectType | undefined> {
    const { type } = config;

    if (type) {
      debug(`Project type from config: ${strong(prettyProjectName(type))} ${type ? strong(`(${type})`) : ''}`);
      return type;
    }
  }

  async getTypeFromDetection(): Promise<ProjectType | undefined> {
    for (const projectType of PROJECT_TYPES) {
      const p = await createProjectFromDetails({ context: 'app', configPath: path.resolve(this.rootDirectory, PROJECT_FILE), type: projectType, errors: [] }, this.e);
      const type = p.type;

      // TODO: This is a hack to avoid accessing `this.config` within the
      // `Project.directory` getter, which writes config files.
      Object.defineProperty(p, 'directory', { value: this.rootDirectory, writable: false });

      if (await p.detected()) {
        debug(`Project type from detection: ${strong(prettyProjectName(type))} ${type ? strong(`(${type})`) : ''}`);
        return type;
      }
    }
  }

  protected async determineSingleApp(config: IProjectConfig): Promise<ProjectDetailsSingleAppResult> {
    const errors: ProjectDetailsError[] = [];

    let type = await resolveValue(
      async () => this.getTypeFromConfig(config),
      async () => this.getTypeFromDetection()
    );

    if (!type) {
      errors.push(new ProjectDetailsError('Could not determine project type', 'ERR_MISSING_PROJECT_TYPE'));
    } else if (!PROJECT_TYPES.includes(type)) {
      errors.push(new ProjectDetailsError(`Invalid project type: ${type}`, 'ERR_INVALID_PROJECT_TYPE'));
      type = undefined;
    }

    return { context: 'app', type, errors };
  }

  protected async determineMultiApp(config: IMultiProjectConfig): Promise<ProjectDetailsMultiAppResult> {
    const errors: ProjectDetailsError[] = [];
    const id = await resolveValue(
      async () => this.getIdFromArgs(),
      async () => this.getIdFromPathMatch(config),
      async () => this.getIdFromDefaultProject(config)
    );

    let type: ProjectType | undefined;

    if (id) {
      const app = config.projects[id];

      if (app) {
        const r = await this.determineSingleApp(app);
        type = r.type;
        errors.push(...r.errors);
      } else {
        errors.push(new ProjectDetailsError('Could not find project in config', 'ERR_MULTI_MISSING_CONFIG'));
      }
    } else {
      errors.push(new ProjectDetailsError('Could not determine project id', 'ERR_MULTI_MISSING_ID'));
    }

    return { context: 'multiapp', id, type, errors };
  }

  processResult(result: ProjectDetailsResult): void {
    const { log } = this.e;
    const errorCodes = result.errors.map(e => e.code);
    const e1 = result.errors.find(e => e.code === 'ERR_INVALID_PROJECT_FILE');
    const e2 = result.errors.find(e => e.code === 'ERR_INVALID_PROJECT_TYPE');

    if (e1) {
      log.error(
        `Error while loading config (project config: ${strong(prettyPath(result.configPath))})\n` +
        `${e1.error ? `${e1.message}: ${failure(e1.error.toString())}` : failure(e1.message)}. ` +
        `Run ${input('ionic init')} to re-initialize your Ionic project. Without a valid project config, the CLI will not have project context.`
      );

      log.nl();
    }

    if (result.context === 'multiapp') {
      if (errorCodes.includes('ERR_MULTI_MISSING_ID')) {
        log.warn(
          `Multi-app workspace detected, but cannot determine which project to use.\n` +
          `Please set a ${input('defaultProject')} in ${strong(prettyPath(result.configPath))} or specify the project using the global ${input('--project')} option. Read the documentation${ancillary('[1]')} for more information.\n\n` +
          `${ancillary('[1]')}: ${strong('https://ion.link/multi-app-docs')}`
        );

        log.nl();
      }

      if (result.id && errorCodes.includes('ERR_MULTI_MISSING_CONFIG')) {
        log.warn(
          `Multi-app workspace detected, but project was not found in configuration.\n` +
          `Project ${input(result.id)} could not be found in the workspace. Did you add it to ${strong(prettyPath(result.configPath))}?`
        );
      }
    }

    if (errorCodes.includes('ERR_MISSING_PROJECT_TYPE')) {
      const listWrapOptions = { width: TTY_WIDTH - 8 - 3, indentation: 1 };

      log.warn(
        `Could not determine project type (project config: ${strong(prettyPath(result.configPath))}).\n` +
        `- ${wordWrap(`For ${strong(prettyProjectName('angular'))} projects, make sure ${input('@ionic/angular')} is listed as a dependency in ${strong('package.json')}.`, listWrapOptions)}\n` +
        `- ${wordWrap(`For ${strong(prettyProjectName('ionic-angular'))} projects, make sure ${input('ionic-angular')} is listed as a dependency in ${strong('package.json')}.`, listWrapOptions)}\n` +
        `- ${wordWrap(`For ${strong(prettyProjectName('ionic1'))} projects, make sure ${input('ionic')} is listed as a dependency in ${strong('bower.json')}.`, listWrapOptions)}\n\n` +
        `Alternatively, set ${strong('type')} attribute in ${strong(prettyPath(result.configPath))} to one of: ${PROJECT_TYPES.map(v => input(v)).join(', ')}.\n\n` +
        `If the Ionic CLI does not know what type of project this is, ${input('ionic build')}, ${input('ionic serve')}, and other commands may not work. You can use the ${input('custom')} project type if that's okay.`
      );

      log.nl();
    }

    if (e2) {
      log.error(
        `${e2.message} (project config: ${strong(prettyPath(result.configPath))}).\n` +
        `Project type must be one of: ${PROJECT_TYPES.map(v => input(v)).join(', ')}`
      );

      log.nl();
    }
  }

  async readConfig(p: string): Promise<{ [key: string]: any; }> {
    try {
      let configContents = await readFile(p, { encoding: 'utf8' });

      if (!configContents) {
        configContents = '{}\n';
        await writeFile(p, configContents, { encoding: 'utf8' });
      }

      return await JSON.parse(configContents);
    } catch (e) {
      throw new ProjectDetailsError('Could not read project file', 'ERR_INVALID_PROJECT_FILE', e);
    }
  }

  /**
   * Gather project details from specified configuration.
   *
   * This method will always resolve with a result object, with an array of
   * errors. Use `processResult()` to log warnings & errors.
   */
  async result(): Promise<ProjectDetailsResult> {
    const errors: ProjectDetailsError[] = [];
    const configPath = path.resolve(this.rootDirectory, PROJECT_FILE);
    let config: { [key: string]: any; } | undefined;

    try {
      config = await this.readConfig(configPath);

      if (isProjectConfig(config)) {
        const r = await this.determineSingleApp(config);
        errors.push(...r.errors);
        return { configPath, errors, ...r };
      }

      if (isMultiProjectConfig(config)) {
        const r = await this.determineMultiApp(config);
        errors.push(...r.errors);
        return { configPath, errors, ...r };
      }

      throw new ProjectDetailsError('Unknown project file structure', 'ERR_INVALID_PROJECT_FILE');
    } catch (e) {
      errors.push(e);
    }

    return { configPath, context: 'unknown', errors };
  }
}

export async function createProjectFromDetails(details: ProjectDetailsResult, deps: ProjectDeps): Promise<IProject> {
  const { context, type } = details;

  switch (type) {
    case 'angular':
      const { AngularProject } = await import('./angular');
      return new AngularProject(details, deps);
    case 'react':
      const { ReactProject } = await import('./react');
      return new ReactProject(details, deps);
    case 'vue':
      const { VueProject } = await import('./vue');
      return new VueProject(details, deps);
    case 'ionic-angular':
      const { IonicAngularProject } = await import('./ionic-angular');
      return new IonicAngularProject(details, deps);
    case 'ionic1':
      const { Ionic1Project } = await import('./ionic1');
      return new Ionic1Project(details, deps);
    case 'custom':
      const { CustomProject } = await import('./custom');
      return new CustomProject(details, deps);
  }

  // If we can't match any of the types above, but we've detected a multi-app
  // setup, it likely means this is a "bare" project, or a project without
  // apps. This can occur when `ionic start` is used for the first time in a
  // new multi-app setup.
  if (context === 'multiapp') {
    const { BareProject } = await import('./bare');
    return new BareProject(details, deps);
  }

  throw new FatalException(`Bad project type: ${strong(String(type))}`); // TODO?
}

export async function findProjectDirectory(cwd: string): Promise<string | undefined> {
  return findBaseDirectory(cwd, PROJECT_FILE);
}

export interface CreateProjectFromDirectoryOptions {
  logErrors?: boolean;
}

export async function createProjectFromDirectory(rootDirectory: string, args: ParsedArgs, deps: ProjectDeps, { logErrors = true }: CreateProjectFromDirectoryOptions = {}): Promise<IProject | undefined> {
  const details = new ProjectDetails({ rootDirectory, args, e: deps });
  const result = await details.result();
  debug('Project details: %o', { ...result, errors: result.errors.map(e => e.code) });

  if (logErrors) {
    details.processResult(result);
  }

  if (result.context === 'unknown') {
    return;
  }

  return createProjectFromDetails(result, deps);
}

export interface ProjectConfigOptions extends BaseConfigOptions {
  readonly type?: ProjectType;
}

export class ProjectConfig extends BaseConfig<IProjectConfig> {
  protected readonly type?: ProjectType;

  constructor(p: string, { type, ...options }: ProjectConfigOptions = {}) {
    super(p, options);
    this.type = type;

    const c = this.c as any;

    if (typeof c.app_id === 'string') { // <4.0.0 project config migration
      if (c.app_id && !c.id) {
        // set `id` only if it has not been previously set and if `app_id`
        // isn't an empty string (which it used to be, sometimes)
        this.set('id', c.app_id);
      }

      this.unset('app_id' as any);
    } else if (typeof c.pro_id === 'string') {
      if (!c.id) {
        // set `id` only if it has not been previously set
        this.set('id', c.pro_id);
      }

      // we do not unset `pro_id` because it would break things
    }
  }

  provideDefaults(c: Partial<Readonly<IProjectConfig>>): IProjectConfig {
    return lodash.assign({
      name: 'New Ionic App',
      integrations: {},
      type: this.type,
    }, c);
  }
}

export class MultiProjectConfig extends BaseConfig<IMultiProjectConfig> {
  provideDefaults(c: Partial<Readonly<IMultiProjectConfig>>): IMultiProjectConfig {
    return lodash.assign({
      projects: {},
    }, c);
  }
}

export interface ProjectDeps {
  readonly client: IClient;
  readonly config: IConfig;
  readonly flags: IonicEnvironmentFlags;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly session: ISession;
  readonly shell: IShell;
  readonly ctx: IonicContext;
}

export abstract class Project implements IProject {
  readonly rootDirectory: string;
  abstract readonly type: ProjectType;
  protected originalConfigFile?: { [key: string]: any };

  constructor(
    readonly details: ProjectDetailsResult,
    protected readonly e: ProjectDeps
  ) {
    this.rootDirectory = path.dirname(details.configPath);
  }

  get filePath(): string {
    return this.details.configPath;
  }

  get directory(): string {
    const root = this.config.get('root');

    if (!root) {
      return this.rootDirectory;
    }

    return path.resolve(this.rootDirectory, root);
  }

  get pathPrefix(): string[] {
    const id = this.details.context === 'multiapp' ? this.details.id : undefined;

    return id ? ['projects', id] : [];
  }

  get config(): ProjectConfig {
    const options = { type: this.type, pathPrefix: this.pathPrefix };

    return new ProjectConfig(this.filePath, options);
  }

  abstract detected(): Promise<boolean>;

  abstract requireBuildRunner(): Promise<import('../build').BuildRunner<any>>;
  abstract requireServeRunner(): Promise<import('../serve').ServeRunner<any>>;
  abstract requireGenerateRunner(): Promise<import('../generate').GenerateRunner<any>>;
  async getBuildRunner(): Promise<import('../build').BuildRunner<any> | undefined> {
    try {
      return await this.requireBuildRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async getServeRunner(): Promise<import('../serve').ServeRunner<any> | undefined> {
    try {
      return await this.requireServeRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async getGenerateRunner(): Promise<import('../generate').GenerateRunner<any> | undefined> {
    try {
      return await this.requireGenerateRunner();
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async requireAppflowId(): Promise<string> {
    const appflowId = this.config.get('id');

    if (!appflowId) {
      throw new FatalException(
        `Your project file (${strong(prettyPath(this.filePath))}) does not contain '${strong('id')}'. ` +
        `Run ${input('ionic link')}.`
      );
    }

    return appflowId;
  }

  get packageJsonPath() {
    return path.resolve(this.directory, 'package.json');
  }

  async getPackageJson(pkgName?: string, { logErrors = true }: { logErrors?: boolean; } = {}): Promise<[PackageJson | undefined, string | undefined]> {
    let pkg: PackageJson | undefined;
    let pkgPath: string | undefined;

    try {
      pkgPath = pkgName ? require.resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
      pkg = await readPackageJsonFile(pkgPath);
    } catch (e) {
      if (logErrors) {
        this.e.log.warn(`Error loading ${strong(pkgName ? pkgName : `project's`)} ${strong('package.json')}: ${e}`);
      }
    }

    return [pkg, pkgPath ? path.dirname(pkgPath) : undefined];
  }

  async requirePackageJson(pkgName?: string): Promise<PackageJson> {
    try {
      const pkgPath = pkgName ? require.resolve(`${pkgName}/package`, { paths: compileNodeModulesPaths(this.directory) }) : this.packageJsonPath;
      return await readPackageJsonFile(pkgPath);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new FatalException(`Could not parse ${strong(pkgName ? pkgName : `project's`)} ${strong('package.json')}. Is it a valid JSON file?`);
      } else if (e === ERROR_INVALID_PACKAGE_JSON) {
        throw new FatalException(`The ${strong(pkgName ? pkgName : `project's`)} ${strong('package.json')} file seems malformed.`);
      }

      throw e; // Probably file not found
    }
  }

  async getDocsUrl(): Promise<string> {
    return 'https://ion.link/docs';
  }

  async getSourceDir(): Promise<string> {
    return path.resolve(this.directory, 'src');
  }

  async getDefaultDistDir(): Promise<string> {
    return 'www';
  }

  async getDistDir(): Promise<string> {
    if (this.getIntegration('capacitor') !== undefined) {
      const conf = new CapacitorConfig(path.resolve(this.directory, CAPACITOR_CONFIG_FILE));
      const webDir = conf.get('webDir');
      if (webDir) {
        return path.resolve(this.directory, webDir);
      } else {
        throw new FatalException(
          `The ${input('webDir')} property must be set in the Capacitor configuration file (${input(CAPACITOR_CONFIG_FILE)}). \n` +
          `See the Capacitor docs for more information: ${strong('https://capacitor.ionicframework.com/docs/basics/configuring-your-app')}`
        );
      }
    } else {
      return path.resolve(this.directory, 'www');
    }
  }

  async getInfo(): Promise<InfoItem[]> {
    const integrations = await this.getIntegrations();
    const integrationInfo = lodash.flatten(await Promise.all(integrations.map(async i => i.getInfo())));

    return integrationInfo;
  }

  async personalize(details: ProjectPersonalizationDetails): Promise<void> {
    const { name, projectId, description, version, themeColor, appIcon, splash } = details;

    this.config.set('name', name);

    const pkg = await this.requirePackageJson();

    pkg.name = projectId;
    pkg.version = version ? version : '0.0.1';
    pkg.description = description ? description : 'An Ionic project';

    await writeJson(this.packageJsonPath, pkg, { spaces: 2 });

    if (themeColor) {
      await this.setPrimaryTheme(themeColor);
    }

    if (appIcon && splash) {
      await this.setAppResources(appIcon, splash);
    }

    const integrations = await this.getIntegrations();

    await Promise.all(integrations.map(async i => i.personalize(details)));
  }

  // Empty to avoid sub-classes having to implement
  // tslint:disable-next-line:no-empty
  async setPrimaryTheme(_themeColor: string): Promise<void> { }

  async writeThemeColor(variablesPath: string, themeColor: string): Promise<void> {
    const light = new Color(themeColor);

    const ionicThemeLightDarkMap = {
      '#3880ff': '#4c8dff', // blue
      '#5260ff': '#6a64ff', // purple
      '#2dd36f': '#2fdf75', // green
      '#ffc409': '#ffd534', // yellow
      '#eb445a': '#ff4961', // red
      '#f4f5f8': '#222428', // light
      '#92949c': '#989aa2', // medium
      '#222428': '#f4f5f8', // dark
    } as { [key: string]: string };

    const matchingThemeColor = ionicThemeLightDarkMap[themeColor];

    let dark;

    // If this is a standard Ionic theme color, then use the hard-coded dark mode
    // colors. Otherwise, compute a plausible dark mode color for this theme
    if (matchingThemeColor) {
      dark = new Color(matchingThemeColor);
    } else if (light.yiq > 128) {
      // Light mode was light enough, just use it for both
      dark = light;
    } else {
      // Light mode was too dark, so tint it to make it brighter
      dark = light.tint(0.6);
    }

    // Build the light colors

    const lightContrastRgb = light.contrast().rgb;

    const lightVariables: { [key: string]: string } = {
      '--ion-color-primary': `${themeColor}`,
      '--ion-color-primary-rgb': `${light.rgb.r}, ${light.rgb.g}, ${light.rgb.b}`,
      '--ion-color-primary-contrast': `${light.contrast().hex}`,
      '--ion-color-primary-contrast-rgb': `${lightContrastRgb.r}, ${lightContrastRgb.g}, ${lightContrastRgb.b}`,
      '--ion-color-primary-shade': `${light.shade().hex}`,
      '--ion-color-primary-tint': `${light.tint().hex}`,
    };

    const darkContrastRgb = dark.contrast().rgb;

    const darkVariables: { [key: string]: string } = {
      '--ion-color-primary': `${dark.hex}`,
      '--ion-color-primary-rgb': `${dark.rgb.r}, ${dark.rgb.g}, ${dark.rgb.b}`,
      '--ion-color-primary-contrast': `${dark.contrast().hex}`,
      '--ion-color-primary-contrast-rgb': `${darkContrastRgb.r}, ${darkContrastRgb.g}, ${darkContrastRgb.b}`,
      '--ion-color-primary-shade': `${dark.shade().hex}`,
      '--ion-color-primary-tint': `${dark.tint().hex}`,
    };

    try {
      let themeVarsContents = await readFile(variablesPath, { encoding: 'utf8' });

      // Replace every theme variable with the updated ones
      for (const v in lightVariables) {
        const regExp = new RegExp(`(${v}):([^;]*)`, 'g');
        let variableIndex = 0;
        themeVarsContents = themeVarsContents.replace(regExp, (str, match) => {
          if (variableIndex === 0) {
            variableIndex++;
            return `${match}: ${lightVariables[v]}`;
          }
          return str;
        });
      }

      for (const v in darkVariables) {
        const regExp = new RegExp(`(${v}):([^;]*)`, 'g');
        let variableIndex = 0;
        themeVarsContents = themeVarsContents.replace(regExp, (str, match) => {
          if (variableIndex === 1) {
            return `${match}: ${darkVariables[v]}`;
          }
          variableIndex++;
          return str;
        });
      }

      await writeFile(variablesPath, themeVarsContents);
    } catch (e) {
      const { log } = this.e;
      log.error(`Unable to modify theme variables, theme will need to be set manually: ${e}`);
    }
  }

  async setAppResources(appIcon: Buffer, splash: Buffer) {
    const resourcesDir = path.join(this.directory, 'resources');
    const iconPath = path.join(resourcesDir, 'icon.png');
    const splashPath = path.join(resourcesDir, 'splash.png');

    try {
      await ensureDir(resourcesDir);

      await writeFile(iconPath, appIcon);
      await writeFile(splashPath, splash);
    } catch (e) {
      const { log } = this.e;
      log.error(`Unable to find or create the resources directory. Skipping icon generation: ${e}`);
    }
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

  async createIntegration(name: IntegrationName): Promise<IIntegration<ProjectIntegration>> {
    return BaseIntegration.createFromName({
      client: this.e.client,
      config: this.e.config,
      log: this.e.log,
      project: this,
      prompt: this.e.prompt,
      session: this.e.session,
      shell: this.e.shell,
    }, name);
  }

  getIntegration(name: IntegrationName): Required<ProjectIntegration> | undefined {
    const integration = this.config.get('integrations')[name];

    if (integration) {
      return {
        enabled: integration.enabled !== false,
        root: integration.root === undefined ? this.directory : path.resolve(this.rootDirectory, integration.root),
      };
    }
  }

  requireIntegration(name: IntegrationName): Required<ProjectIntegration> {
    const id = this.details.context === 'multiapp' ? this.details.id : undefined;
    const integration = this.getIntegration(name);

    if (!integration) {
      throw new FatalException(`Could not find ${strong(name)} integration in the ${strong(id ? id : 'default')} project.`);
    }

    if (!integration.enabled) {
      throw new FatalException(`${strong(name)} integration is disabled in the ${strong(id ? id : 'default')} project.`);
    }

    return integration;
  }

  protected async getIntegrations(): Promise<IIntegration<ProjectIntegration>[]> {
    const integrationsFromConfig = this.config.get('integrations');
    const names = Object.keys(integrationsFromConfig) as IntegrationName[]; // TODO

    const integrationNames = names.filter(n => {
      const c = integrationsFromConfig[n];
      return c && c.enabled !== false;
    });

    const integrations: (IIntegration<ProjectIntegration> | undefined)[] = await Promise.all(integrationNames.map(async name => {
      try {
        return await this.createIntegration(name);
      } catch (e) {
        if (!(e instanceof IntegrationNotFoundException)) {
          throw e;
        }

        this.e.log.warn(e.message);
      }
    }));

    return integrations.filter((i): i is IIntegration<ProjectIntegration> => typeof i !== 'undefined');
  }
}

export function prettyProjectName(type?: string): string {
  if (!type) {
    return 'Unknown';
  }

  if (type === 'angular') {
    return '@ionic/angular';
  } else if (type === 'react') {
    return '@ionic/react';
  } else if (type === 'vue') {
    return '@ionic/vue';
  } else if (type === 'ionic-angular') {
    return 'Ionic 2/3';
  } else if (type === 'ionic1') {
    return 'Ionic 1';
  } else if (type === 'custom') {
    return 'Custom';
  }

  return type;
}

export function isValidProjectId(projectId: string): boolean {
  return projectId !== '.' && isValidPackageName(projectId) && projectId === path.basename(projectId);
}
