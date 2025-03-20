import {
  BaseConfig,
  CommandInstanceInfo as FrameworkCommandInstanceInfo,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata as FrameworkCommandMetadata,
  CommandMetadataInput as FrameworkCommandMetadataInput,
  CommandMetadataOption as FrameworkCommandMetadataOption,
  HydratedCommandMetadata as FrameworkHydratedCommandMetadata,
  ICommand as FrameworkCommand,
  INamespace as FrameworkNamespace,
  NamespaceLocateResult as FrameworkNamespaceLocateResult,
  PackageJson,
} from '@ionic/cli-framework';
import { Logger } from '@ionic/cli-framework-output';
import { PromptModule } from '@ionic/cli-framework-prompts';
import { NetworkInterface } from '@ionic/utils-network';
import { Subprocess, SubprocessOptions, WhichOptions } from '@ionic/utils-subprocess';
import { ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';

import type { Integration as CapacitorIntegration } from './lib/integrations/capacitor';
import type { CapacitorConfig } from './lib/integrations/capacitor/config';
import type { Integration as CordovaIntegration } from './lib/integrations/cordova';
import type { Integration as EnterpriseIntegration } from './lib/integrations/enterprise';

export {
  CommandLineInputs,
  CommandLineOptions,
  NamespaceMetadata,
} from '@ionic/cli-framework';

export type SuperAgentRequest = import('superagent').SuperAgentRequest;

export interface SuperAgentError extends Error {
  response: import('superagent').Response;
}

export type LogFn = (msg: string) => void;

export interface ILogger extends Logger {
  ok: LogFn;
  rawmsg: LogFn;
}

export interface StarterManifest {
  name: string;
  baseref: string;
  welcome?: string;
}

export interface CordovaPackageJson extends PackageJson {
  cordova: {
    platforms: string[];
    plugins: {
      [key: string]: unknown;
    };
  };
}

export interface LegacyAndroidBuildOutputEntry {
  outputType: {
    type: string;
  };
  path: string;
}

export interface AndroidBuildOutput {
  artifactType: {
    type: string;
  };
  elements: {
    outputFile: string;
  }[];
}

export interface Runner<T extends object, U> {
  run(options: T): Promise<U>;
}

export type ProjectType = 'angular' | 'angular-standalone' | 'custom' | 'bare' | 'react' | 'vue' | 'react-vite' | 'vue-vite';
export type HookName = 'build:before' | 'build:after' | 'serve:before' | 'serve:after' | 'capacitor:run:before' | 'capacitor:build:before' | 'capacitor:sync:after';

export type CapacitorRunHookName = 'capacitor:run:before';
export type CapacitorBuildHookName = 'capacitor:build:before';
export type CapacitorSyncHookName = 'capacitor:sync:after';

export interface BaseHookContext {
  project: {
    type: ProjectType;
    dir: string;
    srcDir: string;
  };
  argv: string[];
  env: NodeJS.ProcessEnv;
}

export type AnyServeOptions = ReactServeOptions | AngularServeOptions;
export type AnyBuildOptions = ReactBuildOptions | AngularBuildOptions;

export interface CapacitorSyncHookInput {
  readonly name: CapacitorSyncHookName;
  readonly build?: AnyBuildOptions;
  readonly capacitor: IonicCapacitorOptions;
}
export interface CapacitorRunHookInput {
  readonly name: CapacitorRunHookName;
  readonly serve?: AnyServeOptions;
  readonly build?: AnyBuildOptions;
  readonly capacitor: IonicCapacitorOptions;
}

export interface CapacitorBuildHookInput {
  readonly name: CapacitorBuildHookName;
  readonly build: AnyBuildOptions;
  readonly capacitor: IonicCapacitorOptions;
}

export interface BuildHookInput {
  readonly name: 'build:before' | 'build:after';
  readonly build: AngularBuildOptions;
}

export interface ServeBeforeHookInput {
  readonly name: 'serve:before';
  readonly serve: AngularServeOptions;
}

export interface ServeAfterHookInput {
  readonly name: 'serve:after';
  readonly serve: (AngularServeOptions) & ServeDetails;
}

export type HookInput = BuildHookInput | ServeBeforeHookInput | ServeAfterHookInput | CapacitorRunHookInput | CapacitorBuildHookInput | CapacitorSyncHookInput;
export type HookContext = BaseHookContext & HookInput;

export type HookFn = (ctx: HookContext) => Promise<void>;

export type IntegrationName = 'capacitor' | 'cordova' | 'enterprise';

export interface ProjectIntegration {
  enabled?: boolean;
  root?: string;
}

export interface EnterpriseProjectIntegration extends ProjectIntegration {
  productKey?: string;
  registries?: string[];
  appId?: string;
  orgId?: string;
  keyId?: number;
}

export interface ProjectIntegrations {
  cordova?: ProjectIntegration;
  capacitor?: ProjectIntegration;
  enterprise?: EnterpriseProjectIntegration;
}

export interface Response<T extends object> extends APIResponseSuccess {
  data: T;
}

export interface ResourceClientLoad<T extends object> {
  load(id: string | number, modifiers: ResourceClientRequestModifiers): Promise<T>;
}

export interface ResourceClientDelete {
  delete(id: string | number): Promise<void>;
}

export interface ResourceClientCreate<T extends object, U extends object> {
  create(details: U): Promise<T>;
}

export interface ResourceClientPaginate<T extends object> {
  paginate(args?: Partial<PaginateArgs<Response<T[]>>>): IPaginator<Response<T[]>, PaginatorState>;
}

export interface ResourceClientRequestModifiers {
  fields?: string[];
}

export interface Org {
  name: string;
}

export interface GithubRepo {
  full_name: string;
  id: number;
}

export interface GithubBranch {
  name: string;
}

export interface AppAssociation {
  repository: RepoAssociation;
}

export interface RepoAssociationBase {
  html_url: string;
  clone_url: string;
  full_name: string;
}

export interface GithubRepoAssociation extends RepoAssociationBase {
  type: 'github';
  id: number;
}

export interface GitlabRepoAssociation extends RepoAssociationBase {
  type: 'gitlab';
  id: number;
}

export interface GitlabEnterpriseRepoAssociation extends RepoAssociationBase {
  type: 'gitlab_enterprise';
  id: number;
}

export interface BitbucketCloudRepoAssociation extends RepoAssociationBase {
  type: 'bitbucket_cloud';
  id: string;
}

export interface BitbucketServerRepoAssociation extends RepoAssociationBase {
  type: 'bitbucket_server';
  id: number;
}

export interface AzureDevopsRepoAssociation extends RepoAssociationBase {
  type: 'azure_devops';
  id: string;
}

export type RepoAssociation = GithubRepoAssociation | BitbucketCloudRepoAssociation | BitbucketServerRepoAssociation;

export type AssociationType = 'github' | 'bitbucket_cloud' | 'bitbucket_server';

export interface App {
  id: string;
  name: string;
  slug: string;
  org: null | Org;
  repo_url?: string;
  association?: null | AppAssociation;
}

export interface Login {
  user: User;
  token: string;
}

export interface User {
  id: number;
  email: string;
  oauth_identities?: OAuthIdentity;
}

export type OAuthIdentity = {
  [A in AssociationType]?: OAuthIdentityDetails;
};

export interface OAuthIdentityDetails {
  username: string;
  name: string;
  html_url: string;
}

export interface OAuthServerConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  apiAudience: string;
}

export interface OpenIdToken {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope: 'openid profile email offline_access';
  token_type: 'Bearer';
  state?: string;
}

export interface Snapshot {
  id: string;
  sha: string;
  ref: string;
  state: string;
  created: string;
  note: string;
}

export interface SSHKey {
  id: string;
  pubkey: string;
  fingerprint: string;
  annotation: string;
  name: string;
  created: string;
  updated: string;
}

export interface SecurityProfile {
  name: string;
  tag: string;
  type: 'development' | 'production';
  created: string;
  credentials: {
    android?: object;
    ios?: object;
  };
}

export interface IConfig extends BaseConfig<ConfigFile> {
  getAPIUrl(): string;
  getDashUrl(): string;
  getGitHost(): string;
  getGitPort(): number;
  getHTTPConfig(): CreateRequestOptions;
  getOpenIDOAuthConfig(): OAuthServerConfig;
}

export interface ProjectPersonalizationDetails {
  name: string;
  projectId: string;
  packageId?: string;
  version?: string;
  description?: string;
  themeColor?: string;
  appIcon?: Buffer;
  splash?: Buffer;
}

export interface IProjectConfig {
  name: string;
  type?: ProjectType;
  id?: string;
  root?: string;

  readonly integrations: ProjectIntegrations;
  readonly hooks?: Record<HookName, string | string[] | undefined>;
}

export interface IMultiProjectConfig {
  defaultProject?: string;
  projects: {
    [key: string]: IProjectConfig | undefined;
  };
}

export type ProjectFile = IProjectConfig | IMultiProjectConfig;

export interface IProject {
  readonly rootDirectory: string;
  readonly directory: string;
  readonly filePath: string;
  readonly pathPrefix: readonly string[];
  readonly type: ProjectType;
  readonly config: BaseConfig<IProjectConfig>;
  readonly details: import('./lib/project').ProjectDetailsResult;

  getSourceDir(sourceRoot?: string): Promise<string>;
  getDefaultDistDir(): Promise<string>;
  getDistDir(): Promise<string>;
  getInfo(): Promise<InfoItem[]>;
  detected(): Promise<boolean>;
  createIntegration(name: 'capacitor'): Promise<CapacitorIntegration>;
  createIntegration(name: 'cordova'): Promise<CordovaIntegration>;
  createIntegration(name: 'enterprise'): Promise<EnterpriseIntegration>;
  createIntegration(name: IntegrationName): Promise<IIntegration<ProjectIntegration>>;
  getIntegration(name: IntegrationName): Required<ProjectIntegration> | undefined;
  requireIntegration(name: IntegrationName): Required<ProjectIntegration>;
  requireAppflowId(): Promise<string>;
  getPackageJson(pkgName?: string, options?: { logErrors?: boolean }): Promise<[PackageJson | undefined, string | undefined]>;
  requirePackageJson(pkgName?: string): Promise<PackageJson>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
  getBuildRunner(): Promise<import('./lib/build').BuildRunner<any> | undefined>;
  getServeRunner(): Promise<import('./lib/serve').ServeRunner<any> | undefined>;
  getGenerateRunner(): Promise<import('./lib/generate').GenerateRunner<any> | undefined>;
  requireBuildRunner(): Promise<import('./lib/build').BuildRunner<any>>;
  requireServeRunner(): Promise<import('./lib/serve').ServeRunner<any>>;
  requireGenerateRunner(): Promise<import('./lib/generate').GenerateRunner<any>>;
}

export interface IntegrationAddDetails {
  quiet?: boolean;
  root: string;
  enableArgs?: string[];
}

export interface IntegrationAddHandlers {
  conflictHandler?: (f: string, stats: fs.Stats) => Promise<boolean>;
  onFileCreate?: (f: string) => void;
}

export interface IIntegration<T extends ProjectIntegration> {
  readonly name: IntegrationName;
  readonly summary: string;
  readonly archiveUrl?: string;
  readonly config: BaseConfig<T>;

  add(details: IntegrationAddDetails): Promise<void>;
  isAdded(): boolean;
  enable(config?: T): Promise<void>;
  isEnabled(): boolean;
  disable(): Promise<void>;
  getInfo(): Promise<InfoItem[]>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
}

export interface PackageVersions {
  [key: string]: string;
}

export interface CommandMetadataInput extends FrameworkCommandMetadataInput {
  private?: boolean;
}

export interface CommandMetadataOption extends FrameworkCommandMetadataOption {
  private?: boolean;
  hint?: string;
}

export interface ExitCodeException extends Error {
  exitCode: number;
}

export interface CommandMetadata extends FrameworkCommandMetadata<CommandMetadataInput, CommandMetadataOption> {
  type: 'global' | 'project';
}

export type HydratedCommandMetadata = CommandMetadata & FrameworkHydratedCommandMetadata<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption>;
export type CommandInstanceInfo = FrameworkCommandInstanceInfo<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption>;
export type NamespaceLocateResult = FrameworkNamespaceLocateResult<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption>;

export interface ISession {
  login(email: string, password: string): Promise<void>;
  ssoLogin(email: string): Promise<void>;
  tokenLogin(token: string): Promise<void>;
  webLogin(): Promise<void>;
  wizardLogin(): Promise<string|undefined>;
  logout(): Promise<void>;

  isLoggedIn(): boolean;
  getUser(): { id: number; };
  getUserToken(): Promise<string>;
}

export interface IShellSpawnOptions extends SpawnOptions {
  showCommand?: boolean;
}

export interface IShellOutputOptions extends IShellSpawnOptions {
  fatalOnError?: boolean;
  fatalOnNotFound?: boolean;
  showError?: boolean;
}

export interface IShellRunOptions extends IShellOutputOptions {
  stream?: NodeJS.WritableStream;
  killOnExit?: boolean;
  truncateErrorOutput?: number;
}

export interface IShell {
  alterPath: (path: string) => string;

  run(command: string, args: readonly string[], options: IShellRunOptions): Promise<void>;
  output(command: string, args: readonly string[], options: IShellOutputOptions): Promise<string>;
  spawn(command: string, args: readonly string[], options: IShellSpawnOptions): Promise<ChildProcess>;
  cmdinfo(cmd: string, args?: readonly string[], options?: SubprocessOptions): Promise<string | undefined>;
  which(command: string, options?: WhichOptions): Promise<string>;
  createSubprocess(command: string, args: readonly string[], options?: SubprocessOptions): Promise<Subprocess>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
}

export type NpmClient = 'yarn' | 'npm' | 'pnpm' | 'bun';

export type FeatureId = 'ssl-commands';

export interface ConfigFile {
  'version': string;
  'telemetry': boolean;
  'npmClient': NpmClient;
  'interactive'?: boolean;

  // HTTP configuration
  'proxy'?: string;
  'ssl.cafile'?: string | string[];
  'ssl.certfile'?: string | string[];
  'ssl.keyfile'?: string | string[];

  // Ionic API
  'urls.api'?: string;
  'urls.dash'?: string;
  'git.host'?: string;
  'git.port'?: number;
  'git.setup'?: boolean;
  'org.id'?: string;
  'user.id'?: number;
  'user.email'?: string;
  'tokens.user'?: string;
  'tokens.telemetry'?: string;
  'tokens.refresh'?: string;
  'tokens.issuedOn'?: string;
  'tokens.expiresInSeconds'?: number;
  'tokens.flowName'?: string;

  // oauth configs
  'oauth.openid.authorization_url'?: string;
  'oauth.openid.token_url'?: string;
  'oauth.openid.client_id'?: string;
  'oauth.openid.api_audience'?: string;

  // Features
  'features.ssl-commands'?: boolean;
}

export interface SSLConfig {
  cafile?: string | string[];
  certfile?: string | string[];
  keyfile?: string | string[];
}

export interface CreateRequestOptions {
  userAgent: string;
  ssl?: SSLConfig;
  proxy?: string;
}

export type APIResponse = APIResponseSuccess | APIResponseError;

export interface APIResponseMeta {
  status: number;
  version: string;
  request_id: string;
}

export type APIResponseData = object | object[] | string;

export interface APIResponseErrorDetails {
  error_type: string;
  parameter: string;
  errors: string[];
}

export interface APIResponseError {
  error: APIResponseErrorError;
  meta: APIResponseMeta;
}

export interface APIResponseErrorError {
  message: string;
  link: string | null;
  type: string;
  details?: APIResponseErrorDetails[];
}

export interface APIResponseSuccess {
  data: APIResponseData;
  meta: APIResponseMeta;
}

export interface APIResponsePageTokenMeta extends APIResponseMeta {
  prev_page_token?: string;
  next_page_token?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'PURGE' | 'HEAD' | 'OPTIONS';

export const enum ContentType {
  JSON = 'application/json',
  FORM_URLENCODED = 'application/x-www-form-urlencoded',
  HTML = 'text/html',
}

export interface IClient {
  config: IConfig;

  make(method: HttpMethod, path: string, contentType?: ContentType): Promise<{ req: SuperAgentRequest; }>;
  do(req: SuperAgentRequest): Promise<APIResponseSuccess>;
  paginate<T extends Response<object[]>>(args: PaginateArgs<T>): IPaginator<T>;
}

export type PaginateArgs<T extends Response<object[]>> = Pick<PaginatorDeps<T>, 'reqgen' | 'guard' | 'state' | 'max'>;

export interface IPaginator<T extends Response<object[]>, S = PaginatorState> extends IterableIterator<Promise<T>> {
  readonly state: S;
}

export type PaginatorRequestGenerator = () => Promise<{ req: SuperAgentRequest; }>;
export type PaginatorGuard<T extends Response<object[]>> = (res: APIResponseSuccess) => res is T;

export interface PaginatorState {
  done: boolean;
  loaded: number;
}

export interface PagePaginatorState extends PaginatorState {
  page: number;
  page_size?: number;
}

export interface TokenPaginatorState extends PaginatorState {
  page_token?: string;
}

export interface PaginatorDeps<T extends Response<object[]>, S = PaginatorState> {
  readonly client: IClient;
  readonly reqgen: PaginatorRequestGenerator;
  readonly guard: PaginatorGuard<T>;
  readonly state?: Partial<S>;
  readonly max?: number;
}

export type InfoItemGroup = 'ionic' | 'capacitor' | 'cordova' | 'utility' | 'system' | 'environment';

export interface InfoItem {
  group: InfoItemGroup;
  name: string;
  value: string;
  key?: string;
  flair?: string;
  path?: string;
  hidden?: boolean;
}

export interface BaseBuildOptions {
  engine: string; // browser, cordova, etc.
  platform?: string; // android, ios, etc.
  project?: string;
  verbose?: boolean;
  '--': string[];
}

export interface BuildOptions<T extends ProjectType> extends BaseBuildOptions {
  type: T;
}

export interface AngularBuildOptions extends BuildOptions<'angular'> {
  /**
   * The Angular architect configuration to use for builds.
   *
   * The `--prod` command line flag is a shortcut which translates to the
   * 'production' configuration.
   */
  configuration?: string;
  sourcemaps?: boolean;
  cordovaAssets?: boolean;
  watch?: boolean;
}

export interface ReactBuildOptions extends BuildOptions<'react'> {
  publicUrl?: string;
  ci?: boolean;
  sourceMap?: boolean;
  inlineRuntimeChunk?: boolean;
}

export interface VueBuildOptions extends BuildOptions<'vue'> {
  configuration?: string;
  sourcemaps?: boolean;
}

export interface IonicCapacitorOptions extends CapacitorConfig {
  '--': string[];
  verbose?: boolean;
}

export interface CustomBuildOptions extends BuildOptions<'custom'> {}

export interface GenerateOptions {
  name: string;
}

export interface AngularGenerateOptions extends GenerateOptions {
  [key: string]: any; // TODO
  schematic: string;
}

export interface IonicAngularGenerateOptions extends GenerateOptions {
  type: string;
  module: boolean;
  constants: boolean;
}

export interface ServeOptions {
  // Command Options
  host: string;
  port: number;
  publicHost?: string;
  livereload: boolean;
  proxy: boolean;
  open: boolean;
  browser?: string;
  browserOption?: string;
  platform?: string; // android, ios, etc.
  project?: string;
  verbose?: boolean;
  '--': string[];

  // Additional Options
  externalAddressRequired?: boolean;
  engine: string; // browser, cordova, etc.
}

export interface AngularServeOptions extends ServeOptions {
  consolelogs?: boolean;
  consolelogsPort?: number;
  ssl?: boolean;
  configuration?: string;
  sourcemaps?: boolean;
}

export interface ReactServeOptions extends ServeOptions {
  https?: boolean;
  ci?: boolean;
  reactEditor?: string;
}

export interface VueServeOptions extends ServeOptions {
  https: boolean;
  mode: string;
  configuration?: string;
  sourcemaps?: boolean;
}

export interface CustomServeOptions extends ServeOptions {}

export interface LabServeDetails {
  projectType: ProjectType;
  host: string;
  port: number;
}

export interface ServeDetails {
  custom: boolean;
  protocol: string;
  localAddress: string;
  externalAddress: string;
  port: number;
  externalNetworkInterfaces: NetworkInterface[];
  externallyAccessible: boolean;
}

export interface IonicContext {
  readonly binPath: string;
  readonly libPath: string;
  readonly execPath: string;
  readonly version: string;
}

export interface IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly ctx: IonicContext;
  readonly session: ISession;
  readonly shell: IShell;

  getInfo(): Promise<InfoItem[]>;
}

export interface IonicEnvironmentFlags {
  readonly interactive: boolean;
  readonly confirm: boolean;
}

export type DistTag = 'testing' | 'canary' | 'latest';

export interface ICommand extends FrameworkCommand<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  readonly env: IonicEnvironment;
  readonly project?: IProject;

  execute(inputs: CommandLineInputs, options: CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: CommandLineInputs, options: CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface INamespace extends FrameworkNamespace<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  env: IonicEnvironment;
  project?: IProject;
}

export interface StarterList {
  starters: {
    name: string;
    id: string;
    type: ProjectType;
  }[];
  integrations: {
    name: IntegrationName;
    id: string;
  }[];
}

export interface BaseStarterTemplate {
  name: string;
  projectType: ProjectType;
  description?: string;
}

export interface RepoStarterTemplate extends BaseStarterTemplate {
  type: 'repo';
  repo: string;
}

export interface ManagedStarterTemplate extends BaseStarterTemplate {
  type: 'managed';
  id: string;
}

export type StarterTemplate = RepoStarterTemplate | ManagedStarterTemplate;

export interface ResolvedStarterTemplate extends BaseStarterTemplate {
  archive: string;
}

export interface TelemetryIPCMessage {
  type: 'telemetry';
  data: { command: string; args: string[]; };
}

export interface UpdateCheckIPCMessage {
  type: 'update-check';
}

export type IPCMessage = TelemetryIPCMessage | UpdateCheckIPCMessage;
