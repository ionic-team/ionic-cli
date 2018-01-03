import * as os from 'os';
import { EventEmitter } from 'events';

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

export type LogMsg = string | (() => string);
export type LogFn = (msg: LogMsg) => void;
export type LogLevel = 'debug' | 'info' | 'msg' | 'ok' | 'warn' | 'error' | 'announce';
export type LogPrefix = string | (() => string);

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string | (() => string);
  stream?: NodeJS.WritableStream;
  wrap?: boolean;
}

export interface ILogger {
  readonly level: LogLevel;
  readonly prefix: LogPrefix;
  stream: NodeJS.WritableStream;
  readonly wrap: boolean;

  // log functions
  debug: LogFn;
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

export interface BowerJson {
  name: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
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

export type ProjectType = 'ionic-core-angular' | 'ionic-angular' | 'ionic1' | 'custom';

export interface ProjectIntegration {
  enabled?: boolean;
}

export interface ProjectFile {
  name: string;
  type: ProjectType;
  app_id: string;
  integrations: {
    cordova?: ProjectIntegration;
    [key: string]: ProjectIntegration | undefined;
  };
  documentRoot?: string; // www folder location (TODO: use this everywhere)
  watchPatterns?: string[];
  proxies?: ProjectFileProxy[];
}

export interface Response<T> extends APIResponseSuccess {
  data: T;
}

export interface AppDetails {
  id: string;
  name: string;
  slug: string;
  repo_url?: string;
}

export interface AuthToken {
  token: string;
  details: {
    app_id: string;
    type: 'app-user';
    user_id: string;
  };
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

export interface DeploySnapshot {
  uuid: string;
  url: string;
}

export interface DeploySnapshotRequest extends DeploySnapshot {
  presigned_post: {
    url: string;
    fields: Object;
  };
}

export interface DeployChannel {
  uuid: string;
  tag: string;
}

export interface Deploy {
  uuid: string;
  snapshot: string;
  channel: string;
}

export interface PackageProjectRequest {
  id: number;
  presigned_post: {
    url: string;
    fields: Object;
  };
}

export interface PackageBuild {
  id: number;
  name: string | null;
  created: string;
  completed: string | null;
  platform: 'android' | 'ios';
  status: 'SUCCESS' | 'FAILED' | 'QUEUED' | 'BUILDING';
  mode: 'debug' | 'release';
  security_profile_tag: string | null;
  url?: string | null;
  output?: string | null;
}

export interface SecurityProfile {
  name: string;
  tag: string;
  type: 'development' | 'production';
  created: string;
  credentials: {
    android?: Object;
    ios?: Object;
  };
}

export interface IApp {
  load(app_id?: string): Promise<AppDetails>;
  paginate(): Promise<IPaginator<Response<AppDetails[]>>>;
  create(app: { name: string; }): Promise<AppDetails>;
}

export interface IConfig extends IBaseConfig<ConfigFile> {
  getAPIUrl(): Promise<string>;
  getDashUrl(): Promise<string>;
  getGitHost(): Promise<string>;
  getGitPort(): Promise<number>;
}

export interface IProject extends IBaseConfig<ProjectFile> {
  formatType(input: ProjectType): string;
  getSourceDir(): Promise<string>;
  loadAppId(): Promise<string>;
  loadPackageJson(): Promise<framework.PackageJson>;
  loadBowerJson(): Promise<BowerJson>;
}

export interface PackageVersions {
  [key: string]: string;
}

export interface CommandMetadataOption extends framework.CommandMetadataOption {
  backends?: BackendFlag[];
  intents?: string[];
  private?: boolean;
  visible?: boolean;
}

export interface ExitCodeException extends Error {
  exitCode: number;
}

export type BackendFlag = 'pro' | 'legacy';

export interface CommandMetadata extends framework.CommandMetadata<framework.CommandMetadataInput, CommandMetadataOption> {
  type: 'global' | 'project';
  backends?: BackendFlag[];
}

export type HydratedCommandMetadata = CommandMetadata & framework.HydratedCommandMetadata<ICommand, INamespace, CommandMetadata, framework.CommandMetadataInput, CommandMetadataOption>;

export interface ISession {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getUserToken(): Promise<string>;
  getAppUserToken(app_id?: string): Promise<string>;
}

export interface IShellSpawnOptions extends crossSpawnType.SpawnOptions {
  showCommand?: boolean;
}

export interface IShellRunOptions extends IShellSpawnOptions {
  showExecution?: boolean;
  showError?: boolean;
  showSpinner?: boolean;
  fatalOnNotFound?: boolean;
  fatalOnError?: boolean;
  truncateErrorOutput?: number;
  logOptions?: IShellRunLogOptions;
}

export type IShellRunLogOptions = Partial<LoggerOptions> & { stdoutTransform?: NodeJS.ReadWriteStream; stderrTransform?: NodeJS.ReadWriteStream };

export interface IShell {
  run(command: string, args: string[], options: IShellRunOptions): Promise<string>;
  spawn(command: string, args: string[], options: IShellSpawnOptions): Promise<crossSpawnType.ChildProcess>;
  cmdinfo(cmd: string, args?: string[]): Promise<string | undefined>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
  resetToken(): Promise<void>;
}

export interface ConfigFile {
  version: string;
  created: string;
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
  devapp: {
    knownInterfaces: {
      mac: string;
      trusted: boolean;
    }[];
  };
  ssl?: {
    cafile?: string | string[];
    certfile?: string | string[];
    keyfile?: string | string[];
  };
  git: {
    setup?: boolean;
  };
  user: {
    id?: string;
    email?: string;
  };
  tokens: {
    user?: string;
    telemetry?: string;
    appUser: { [app_id: string]: string };
  };
  backend: BackendFlag;
  telemetry: boolean;
  interactive?: boolean;
  yarn: boolean;
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

export type APIResponseData = Object | Object[] | string;

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

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'PURGE' | 'HEAD' | 'OPTIONS';

export interface IClient {
  config: IConfig;

  make(method: HttpMethod, path: string): Promise<{ req: superagentType.SuperAgentRequest; }>;
  do(req: superagentType.SuperAgentRequest): Promise<APIResponseSuccess>;
  paginate<T extends Response<Object[]>>(reqgen: () => Promise<{ req: superagentType.SuperAgentRequest; }>, guard: (res: APIResponseSuccess) => res is T): Promise<IPaginator<T>>;
}

export interface IPaginator<T extends Response<Object[]>> extends IterableIterator<Promise<T>> {}

export interface EnvironmentHookArgs {
  env: IonicEnvironment;
}

export interface BuildAfterHookArgs extends EnvironmentHookArgs {
  platform?: string;
}

export interface InfoHookItem {
  type: 'system' | 'global-packages' | 'local-packages' | 'cli-packages' | 'environment' | 'misc';
  key: string;
  value: string;
  flair?: string;
  path?: string;
}

export interface BuildOptions {
  target?: string;
  platform?: string;
}

export interface ServeOptions {
  // Command Options
  address: string;
  port: number;
  livereloadPort: number; // TODO: move to `ionic-angular` and `ionic1` serve options
  notificationPort: number; // TODO: move to `ionic-angular` and `ionic1` serve options
  consolelogs: boolean;
  serverlogs: boolean;
  livereload: boolean;
  proxy: boolean;
  lab: boolean;
  open: boolean;
  browser?: string;
  browserOption?: string;
  env?: string;
  devapp: boolean;
  target?: string;
  platform?: string;

  // Additional Options
  externalAddressRequired?: boolean;
}

export interface LabServeDetails {
  protocol: string;
  address: string;
  port: number;
}

export interface ServeDetails {
  protocol: string;
  localAddress: string;
  externalAddress: string;
  port: number;
  externalNetworkInterfaces: NetworkInterface[];
  externallyAccessible: boolean;
}

export interface CordovaProjectInfoHookResponse {
  id: string;
  name: string;
  version: string;
}

export interface IHook<T, U> {
  source: string;
  name: string;

  fire(args: T): Promise<U>;
}

export interface IHookEngine {
  fire(hook: 'info', args: EnvironmentHookArgs): Promise<InfoHookItem[]>;
  fire(hook: 'cordova:project:info', args: EnvironmentHookArgs): Promise<CordovaProjectInfoHookResponse[]>;
  fire(hook: 'plugins:init', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'build:before', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'build:after', args: BuildAfterHookArgs): Promise<void[]>;
  fire(hook: 'watch:before', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'backend:changed', args: EnvironmentHookArgs): Promise<void[]>;

  register(source: string, hook: 'info', listener: (args: EnvironmentHookArgs) => Promise<InfoHookItem[]>): void;
  register(source: string, hook: 'cordova:project:info', listener: (args: EnvironmentHookArgs) => Promise<CordovaProjectInfoHookResponse>): void;
  register(source: string, hook: 'plugins:init', listener: (args: EnvironmentHookArgs) => Promise<void>): void;
  register(source: string, hook: 'build:before', listener: (args: EnvironmentHookArgs) => Promise<void>): void;
  register(source: string, hook: 'build:after', listener: (args: BuildAfterHookArgs) => Promise<void>): void;
  register(source: string, hook: 'watch:before', listener: (args: EnvironmentHookArgs) => Promise<void>): void;
  register(source: string, hook: 'backend:changed', listener: (args: EnvironmentHookArgs) => Promise<void>): void;

  getSources(hook: string): string[];
  hasSources(hook: string, sources: string[]): boolean;
  deleteSource(source: string): void;

  getRegistered<T, U>(hook: string): IHook<T, U>[];
}

export interface ICLIEventEmitter extends EventEmitter {
  on(event: 'watch:init', listener: () => void): this;
  on(event: 'watch:change', listener: (path: string) => void): this;

  emit(event: 'watch:init'): boolean;
  emit(event: 'watch:change', path: string): boolean;
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
  readonly hooks: IHookEngine;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly events: ICLIEventEmitter;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly meta: IonicEnvironmentMeta;
  project: IProject; // project config (ionic.config.json)
  readonly plugins: IonicEnvironmentPlugins;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: ITaskChain;
  readonly telemetry: ITelemetry;
  readonly namespace: IRootNamespace;
  keepopen: boolean;

  open(): Promise<void>;
  close(): Promise<void>;
  runCommand(pargv: string[], opts?: { showExecution?: boolean; }): Promise<void>;
  load(modulePath: 'superagent'): typeof superagentType;
}

export interface IonicEnvironmentFlags {
  interactive: boolean;
  confirm: boolean;
}

export interface IonicEnvironmentMeta {
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
  registerHooks?(hooks: IHookEngine): void;

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

  execute(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions): Promise<void>;
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
    name: string;
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

export interface IntegrationTemplate {
  name: string;
  archive?: string;
}

export type NetworkInterface = { deviceName: string; } & os.NetworkInterfaceInfo;

export interface IPCMessage {
  type: 'telemetry';
  data: { command: string; args: string[]; };
}
