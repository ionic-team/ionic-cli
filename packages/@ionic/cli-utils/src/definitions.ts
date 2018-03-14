import * as fs from 'fs';
import * as os from 'os';

import * as crossSpawnType from 'cross-spawn';
import * as inquirerType from 'inquirer';
import * as superagentType from 'superagent';

import * as framework from '@ionic/cli-framework';

export {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadataInput,
  NamespaceMetadata,
  PackageJson,
} from '@ionic/cli-framework';

export interface SuperAgentError extends Error {
  response: superagentType.Response;
}

export type LogFn = (msg: string) => void;
export type LogLevel = 'info' | 'msg' | 'ok' | 'warn' | 'error' | 'announce';
export type LogPrefix = string | (() => string);

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string | (() => string);
  outstream?: NodeJS.WritableStream;
  errstream?: NodeJS.WritableStream;
  wrap?: boolean;
}

export interface ILogger {
  readonly level: LogLevel;
  readonly prefix: LogPrefix;
  outstream: NodeJS.WritableStream;
  errstream: NodeJS.WritableStream;
  readonly wrap: boolean;

  // log functions
  info: LogFn;
  ok: LogFn;
  warn: LogFn;
  error: LogFn;
  announce: LogFn;
  msg: LogFn;
  rawmsg: LogFn;
  nl(num?: number): void;

  createWriteStream(): NodeJS.WritableStream;
  clone(opts?: Partial<LoggerOptions>): ILogger;
  shouldLog(level: LogLevel): boolean;
}

export interface ITask {
  msg: string;
  running: boolean;
  progressRatio: number;

  start(): this;
  progress(prog: number, total: number): this;
  clear(): this;
  succeed(): this;
  fail(): this;
  end(): this;
}

export interface ITaskChain {
  next(msg: string): ITask;
  updateMsg(msg: string): this;
  end(): this;
  fail(): this;
  cleanup(): this;
}

export interface StarterManifest {
  name: string;
  baseref: string;
  welcome?: string;
}

export interface CordovaPackageJson extends framework.PackageJson {
  cordova: {
    platforms: string[];
    plugins: {
      [key: string]: {};
    };
  };
}

export interface ProjectFileProxy {
  path: string;
  proxyUrl: string;
  proxyNoAgent: boolean;

  /**
   * @deprecated
   */
  rejectUnauthorized: boolean;
}

export type ProjectType = 'angular' | 'ionic-angular' | 'ionic1' | 'custom';
export type HookName = 'build:before' | 'build:after' | 'serve:before' | 'serve:after';

export interface BaseHookContext {
  project: {
    type: ProjectType;
    dir: string;
    srcDir: string;
  };
  argv: string[];
  env: { [key: string]: string | undefined; };
}

export interface BuildHookInput {
  readonly name: 'build:before' | 'build:after';
  readonly build: AngularBuildOptions | IonicAngularBuildOptions | Ionic1BuildOptions;
}

export interface ServeBeforeHookInput {
  readonly name: 'serve:before';
  readonly serve: AngularServeOptions | IonicAngularServeOptions | Ionic1ServeOptions;
}

export interface ServeAfterHookInput {
  readonly name: 'serve:after';
  readonly serve: (AngularServeOptions | IonicAngularServeOptions | Ionic1ServeOptions) & ServeDetails;
}

export type HookInput = BuildHookInput | ServeBeforeHookInput | ServeAfterHookInput;
export type HookContext = BaseHookContext & HookInput;

export type HookFn = (ctx: HookContext) => Promise<void>;

export type IntegrationName = 'cordova';

export interface ProjectIntegration {
  enabled?: boolean;
}

export interface ProjectCordovaIntegration extends ProjectIntegration {
  setupEngineHooks?: boolean;
}

export interface ProjectIntegrations {
  cordova?: ProjectCordovaIntegration;
}

export interface ProjectFile {
  name: string;
  app_id: string;
  readonly integrations: ProjectIntegrations;
  readonly hooks: Record<HookName, string | string[] | undefined>;

  ssl?: {
    key?: string;
    cert?: string;
  };

  /**
   * @deprecated
   */
  watchPatterns?: string[];

  /**
   * @deprecated
   */
  proxies?: ProjectFileProxy[];

  /**
   * @deprecated
   */
  documentRoot?: string;
}

export interface Response<T> extends APIResponseSuccess {
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
  repository: GithubRepoAssociation;
}

export interface RepoAssociation {
  html_url: string;
  clone_url: string;
  full_name: string;
}

export interface GithubRepoAssociation extends RepoAssociation {
    type: 'github';
    id: number;
}

export type AssociationType = 'github';

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

export interface IConfig extends IBaseConfig<ConfigFile> {
  getAPIUrl(): Promise<string>;
  getDashUrl(): Promise<string>;
  getGitHost(): Promise<string>;
  getGitPort(): Promise<number>;
}

export interface ProjectPersonalizationDetails {
  appName: string;
  displayName?: string;
  bundleId?: string;
  version?: string;
  description?: string;
}

export interface IProject extends IBaseConfig<ProjectFile> {
  type?: ProjectType;

  refreshIntegrations(): Promise<void>;
  getDocsUrl(): Promise<string>;
  getSourceDir(): Promise<string>;
  getInfo(): Promise<InfoItem[]>;
  detected(): Promise<boolean>;
  loadAppId(): Promise<string>;
  loadPackageJson(): Promise<framework.PackageJson>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
  getAilmentRegistry(env: IonicEnvironment): Promise<IAilmentRegistry>;
}

export interface IIntegrationAddOptions {
  conflictHandler?(f: string, stats: fs.Stats): Promise<boolean>;
  onFileCreate?(f: string): void;
}

export interface IIntegration {
  name: IntegrationName;
  archiveUrl?: string;

  add(opts?: IIntegrationAddOptions): Promise<void>;
  enable(): Promise<void>;
  disable(): Promise<void>;

  getConfig(): Promise<ProjectIntegration | undefined>;
  getInfo(): Promise<InfoItem[]>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
}

export interface PackageVersions {
  [key: string]: string;
}

export interface CommandMetadataOption extends framework.CommandMetadataOption {
  private?: boolean;
  hint?: string;
}

export interface ExitCodeException extends Error {
  exitCode: number;
}

export interface CommandMetadata extends framework.CommandMetadata<framework.CommandMetadataInput, CommandMetadataOption> {
  type: 'global' | 'project';
}

export type HydratedCommandMetadata = CommandMetadata & framework.HydratedCommandMetadata<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption>;
export type CommandInstanceInfo = framework.CommandInstanceInfo<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption>;
export type NamespaceLocateResult = framework.NamespaceLocateResult<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption>;

export interface ISession {
  login(email: string, password: string): Promise<void>;
  tokenLogin(token: string): Promise<void>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getUser(): Promise<{ id: number; }>;
  getUserToken(): Promise<string>;
}

export interface IShellSpawnOptions extends crossSpawnType.SpawnOptions {
  showCommand?: boolean;
}

export interface IShellOutputOptions extends IShellSpawnOptions {
  fatalOnError?: boolean;
}

export interface IShellRunOptions extends IShellOutputOptions {
  showError?: boolean;
  fatalOnNotFound?: boolean;
  truncateErrorOutput?: number;
  logOptions?: IShellRunLogOptions;
}

export type IShellRunLogOptions = Partial<LoggerOptions> & { stdoutTransform?: NodeJS.ReadWriteStream; stderrTransform?: NodeJS.ReadWriteStream };

export interface IShell {
  run(command: string, args: string[], options: IShellRunOptions): Promise<void>;
  output(command: string, args: string[], options: IShellOutputOptions): Promise<string>;
  spawn(command: string, args: string[], options: IShellSpawnOptions): Promise<crossSpawnType.ChildProcess>;
  cmdinfo(cmd: string, args?: string[]): Promise<string | undefined>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
  resetToken(): Promise<void>;
}

export type NpmClient = 'yarn' | 'npm';

export interface ConfigFile {
  state: {
    lastCommand: string;
    doctor: {
      ignored: string[];
    };
  };
  addresses: {
    dashUrl?: string;
    apiUrl?: string;
    gitHost?: string;
    gitPort?: number;
  };
  ssl?: SSLConfig;
  git: {
    setup?: boolean;
  };
  user: {
    id?: number;
    email?: string;
  };
  tokens: {
    user?: string;
    telemetry?: string;
  };
  telemetry: boolean;
  interactive?: boolean;
  npmClient: NpmClient;
}

export interface SSLConfig {
  cafile?: string | string[];
  certfile?: string | string[];
  keyfile?: string | string[];
}

export interface CreateRequestOptions {
  ssl?: SSLConfig;
}

export interface IBaseConfig<T extends { [key: string]: any }> {
  directory: string;
  fileName: string;
  filePath: string;

  load(options?: { disk?: boolean; }): Promise<T>;
  save(configFile?: T): Promise<void>;
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

export interface IClient {
  config: IConfig;

  make(method: HttpMethod, path: string): Promise<{ req: superagentType.SuperAgentRequest; }>;
  do(req: superagentType.SuperAgentRequest): Promise<APIResponseSuccess>;
  paginate<T extends Response<object[]>>(args: PaginateArgs<T>): IPaginator<T>;
}

export type PaginateArgs<T extends Response<object[]>> = Pick<PaginatorDeps<T>, 'reqgen' | 'guard' | 'state' | 'max'>;

export interface IPaginator<T extends Response<object[]>, S = PaginatorState> extends IterableIterator<Promise<T>> {
  readonly state: S;
}

export type PaginatorRequestGenerator = () => Promise<{ req: superagentType.SuperAgentRequest; }>;
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

export interface InfoItem {
  type: 'system' | 'global-packages' | 'local-packages' | 'cli-packages' | 'environment' | 'misc';
  key: string;
  value: string;
  flair?: string;
  path?: string;
}

export interface BaseBuildOptions {
  engine: string; // browser, cordova, etc.
  platform?: string; // android, ios, etc.
  '--': string[];
}

export interface BuildOptions<T extends ProjectType> extends BaseBuildOptions {
  type: T;
}

export interface AngularBuildOptions extends BuildOptions<'angular'> {
  target?: string;
  environment?: string;
}

export interface IonicAngularBuildOptions extends BuildOptions<'ionic-angular'> {
  prod: boolean;
  aot: boolean;
  minifyjs: boolean;
  minifycss: boolean;
  optimizejs: boolean;
  target?: string;
  env?: string;
}

export interface Ionic1BuildOptions extends BuildOptions<'ionic1'> {}

export interface GenerateOptions {
  type: string;
  name: string;
}

export interface AngularGenerateOptions extends GenerateOptions {
  dryRun: boolean;
  force: boolean;
  [key: string]: string | boolean;
}

export interface IonicAngularGenerateOptions extends GenerateOptions {
  module: boolean;
  constants: boolean;
}

export interface ServeOptions {
  // Command Options
  address: string;
  port: number;
  ssl: boolean;
  livereload: boolean;
  proxy: boolean;
  lab: boolean;
  labHost: string;
  labPort: number;
  open: boolean;
  browser?: string;
  browserOption?: string;
  devapp: boolean;
  platform?: string; // android, ios, etc.
  '--': string[];

  // Additional Options
  externalAddressRequired?: boolean;
  engine: string; // browser, cordova, etc.
}

export interface AngularServeOptions extends ServeOptions {
  target?: string;
  environment?: string;
}

export interface IonicAngularServeOptions extends ServeOptions {
  consolelogs: boolean;
  serverlogs: boolean;
  env?: string;
  livereloadPort: number;
  notificationPort: number;
}

export interface Ionic1ServeOptions extends ServeOptions {
  consolelogs: boolean;
  serverlogs: boolean;
  livereloadPort: number;
  notificationPort: number;
}

export interface LabServeDetails {
  protocol: string;
  address: string;
  port: number;
  ssl?: {
    key: string;
    cert: string;
  };
}

export interface DevAppDetails {
  channel?: string;
  port: number;
  commPort: number;
  interfaces: {
    address: string;
    broadcast: string;
  }[];
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

export interface IAilment {
  id: string;
  getMessage(): Promise<string>;
  getTreatmentSteps(): Promise<TreatmentStep[]>;
  detected(): Promise<boolean>;
}

export interface IAutomaticallyTreatableAilment extends IAilment {
  treat(): Promise<boolean>;
  getTreatmentSteps(): Promise<AutomaticTreatmentStep[]>;
}

export interface TreatmentStep {
  name: string;
}

export interface AutomaticTreatmentStep extends TreatmentStep {
  treat(): Promise<void>;
}

export interface IAilmentRegistry {
  ailments: IAilment[];

  register(ailment: IAilment): void;
  get(id: string): void;
}

export interface AngularCLIJson {
  project: {
    name: string;
  };
}

export interface PromptQuestion extends inquirerType.Question {
  type: string; // type is required
  message: string; // message is required
  name: string; // name is required
}

export interface ConfirmPromptQuestion extends PromptQuestion {
  type: 'confirm';
  noninteractiveValue?: boolean;
}

export interface NonConfirmPromptQuestion extends PromptQuestion {
  type: 'input' | 'password' | 'list';
  noninteractiveValue?: string;
}

export interface CheckboxPromptQuestion extends PromptQuestion {
  type: 'checkbox';
  noninteractiveValue?: string;
}

export interface PromptModule {
  (question: ConfirmPromptQuestion): Promise<boolean>;
  (question: NonConfirmPromptQuestion): Promise<string>;
  (question: CheckboxPromptQuestion): Promise<string[]>;
}

export interface IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly meta: CLIMeta;
  project: IProject; // project config (ionic.config.json)
  readonly plugins: IonicEnvironmentPlugins;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: ITaskChain;
  readonly telemetry: ITelemetry;
  readonly namespace: IRootNamespace;
  keepopen: boolean;

  open(): void;
  close(): void;
  getInfo(): Promise<InfoItem[]>;
  runCommand(pargv: string[], opts?: { showExecution?: boolean; }): Promise<void>;
}

export interface IonicEnvironmentFlags {
  interactive: boolean;
  confirm: boolean;
}

export interface CLIMeta {
  cwd: string;
  local: boolean; // CLI running in local mode?
  binPath: string;
  libPath: string;
}

export interface IonicEnvironmentPlugins {
  ionic: RootPlugin;
  [key: string]: Plugin;
}

export type DistTag = 'testing' | 'canary' | 'latest';

export interface PluginMeta {
  distTag: DistTag;
  filePath: string;
  pkg: framework.PackageJson;
}

export interface Plugin {
  getInfo?(): Promise<InfoItem[]>;

  /**
   * @deprecated
   */
  version?: string;
}

export interface LoadedPlugin extends Plugin {
  meta: PluginMeta;
}

export interface RootPlugin extends LoadedPlugin {
  namespace: IRootNamespace;
}

export interface ICommand extends framework.ICommand<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption> {
  env: IonicEnvironment;

  execute(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface INamespace extends framework.INamespace<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption> {
  env: IonicEnvironment;
}

export interface IRootNamespace extends INamespace {
  runCommand(pargv: string[], env: { [key: string]: string; }): Promise<void>;
}

export interface ImageResource {
  platform: string;
  imageId?: string;
  dest: string;
  resType: string;
  nodeName: string;
  nodeAttributes: string[];
  name: string;
  width: number;
  height: number;
  density?: string;
  orientation?: 'landscape' | 'portrait';
}

export interface ResourcesImageConfig {
  name: string;
  width: number;
  height: number;
  density?: string;
  orientation?: 'landscape' | 'portrait';
}

export interface SourceImage {
  ext: string;
  imageId?: string;
  cachedId?: string;
  platform: string;
  resType: string;
  path: string;
  vector: boolean;
  width: number;
  height: number;
}

export interface ImageUploadResponse {
  Error: string;
  Width: number;
  Height: number;
  Type: string;
  Vector: boolean;
}

export interface ResourcesPlatform {
  [imgType: string]: {
    images: ResourcesImageConfig[];
    nodeName: string;
    nodeAttributes: string[];
  };
}

export interface ResourcesConfig {
  [propName: string]: ResourcesPlatform;
}

export type KnownPlatform = 'ios' | 'android' | 'wp8' | 'windows' | 'browser';
export type KnownResourceType = 'icon' | 'splash';

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

export interface StarterTemplate {
  name: string;
  type: ProjectType;
  id: string;
  description?: string;
  strip?: boolean;
}

export interface ResolvedStarterTemplate extends StarterTemplate {
  archive: string;
}

export type NetworkInterface = { deviceName: string; } & os.NetworkInterfaceInfo;

export interface IPCMessage {
  type: 'telemetry';
  data: { command: string; args: string[]; };
}
