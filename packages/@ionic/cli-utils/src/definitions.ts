import * as crossSpawnType from 'cross-spawn';
import * as inquirerType from 'inquirer';
import * as superagentType from 'superagent';
import * as minimistType from 'minimist';
import * as framework from '@ionic/cli-framework';

import { EventEmitter } from 'events';

export { CommandInput, CommandLineInput, CommandLineInputs, CommandLineOptions, CommandOptionType } from '@ionic/cli-framework';

export interface SuperAgentError extends Error {
  response: superagentType.Response;
}

export type LogFn = (msg: string | (() => string)) => void;
export type LogLevel = 'debug' | 'info' | 'ok' | 'warn' | 'error' | 'announce';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string | (() => string);
  stream?: NodeJS.WritableStream;
}

export interface ILogger {
  level: LogLevel;
  prefix: string | (() => string);
  stream: NodeJS.WritableStream;

  debug: LogFn;
  info: LogFn;
  ok: LogFn;
  warn: LogFn;
  error: LogFn;
  announce: LogFn;
  msg: LogFn;
  nl(num?: number): void;
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

export interface PackageJson {
  name: string;
  version?: string;
  scripts?: { [key: string]: string };
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

export interface CordovaPackageJson extends PackageJson {
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
  proxyUrl: string;
  proxyNoAgent: boolean;
  rejectUnauthorized: boolean;
  path: string;
}

export type ProjectType = 'ionic-angular' | 'ionic1' | 'custom';

export interface ProjectIntegration {
  enabled?: boolean;
}

export interface ProjectIntegrationGulp extends ProjectIntegration {
  file?: string; // gulpfile.js location, because some people use Gulpfile.js
}

export interface ProjectFile {
  name: string;
  type: ProjectType;
  app_id: string;
  integrations: {
    cordova?: ProjectIntegration;
    gulp?: ProjectIntegrationGulp;
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
  isUpdatingEnabled(): Promise<boolean>;
  getAPIUrl(): Promise<string>;
  getDashUrl(): Promise<string>;
  getGitHost(): Promise<string>;
  getGitPort(): Promise<number>;
}

export interface IProject extends IBaseConfig<ProjectFile> {
  formatType(input: ProjectType): string;
  getSourceDir(): Promise<string>;
  loadAppId(): Promise<string>;
  loadPackageJson(): Promise<PackageJson>;
  loadBowerJson(): Promise<BowerJson>;
}

export interface PackageVersions {
  [key: string]: string;
}

export interface DaemonFile {
  daemonVersion: string;
  latestVersions: {
    latest: PackageVersions;
    [key: string]: PackageVersions;
  };
}

export interface IDaemon extends IBaseConfig<DaemonFile> {
  pidFilePath: string;
  portFilePath: string;
  logFilePath: string;
  getPid(): Promise<number | undefined>;
  setPid(pid: number): Promise<void>;
  getPort(): Promise<number | undefined>;
  setPort(port: number): Promise<void>;
  populateDistTag(distTag: DistTag): void;
}

export type CommandOptionTypeDefaults = Map<framework.CommandOptionType, framework.CommandLineInput>;

export interface CommandOption extends framework.CommandOption {
  backends?: BackendFlag[];
}

export interface NormalizedCommandOption extends CommandOption {
  type: framework.CommandOptionType;
  default: framework.CommandLineInput;
  aliases: string[];
}

export interface ExitCodeException extends Error {
  exitCode: number;
}

export interface NormalizedMinimistOpts extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: framework.CommandLineInput };
}

export type BackendFlag = 'pro' | 'legacy';

export interface CommandData extends framework.CommandData<framework.CommandInput, CommandOption> {
  type: 'global' | 'project';
  backends?: BackendFlag[];
  fullName?: string;
}

export interface HydratedCommandData extends CommandData {
  namespace: INamespace;
  aliases: string[];
  fullName: string;
}

export interface ISession {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getUserToken(): Promise<string>;
  getAppUserToken(app_id?: string): Promise<string>;
}

export interface IShellRunOptions extends crossSpawnType.SpawnOptions {
  showCommand?: boolean;
  showExecution?: boolean;
  showError?: boolean;
  showSpinner?: boolean;
  fatalOnNotFound?: boolean;
  fatalOnError?: boolean;
  truncateErrorOutput?: number;
}

export interface IShell {
  run(command: string, args: string[], options: IShellRunOptions): Promise<string>;
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
    lastNoResponseToUpdate?: string;
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
  daemon: {
    updates: boolean;
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

export interface InfoHookArgs extends EnvironmentHookArgs {
  project: IProject;
}

export interface BuildAfterHookArgs extends EnvironmentHookArgs {
  platform?: string;
}

export interface InfoHookItem {
  type: 'system' | 'global-packages' | 'local-packages' | 'cli-packages' | 'misc';
  key: string;
  value: string;
  flair?: string;
  path?: string;
}

export interface ServeOptions {
  // Command Options
  address: string;
  port: number;
  livereloadPort: number;
  notificationPort: number;
  consolelogs: boolean;
  serverlogs: boolean;
  livereload: boolean;
  proxy: boolean;
  lab: boolean;
  browser: boolean;
  browserName?: string;
  browserOption?: string;
  basicAuth?: [string, string];
  env?: string;

  // Additional Options
  externalAddressRequired?: boolean;

  /**
   * @deprecated
   */
  iscordovaserve?: boolean;
}

export interface ServeDetails {
  protocol: string;
  localAddress: string;
  externalAddress: string; // chosen/preferred external address
  externalAddresses: string[];
  port: number;
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
  fire(hook: 'info', args: InfoHookArgs): Promise<InfoHookItem[]>;
  fire(hook: 'cordova:project:info', args: EnvironmentHookArgs): Promise<CordovaProjectInfoHookResponse[]>;
  fire(hook: 'plugins:init', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'build:before', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'build:after', args: BuildAfterHookArgs): Promise<void[]>;
  fire(hook: 'watch:before', args: EnvironmentHookArgs): Promise<void[]>;
  fire(hook: 'backend:changed', args: EnvironmentHookArgs): Promise<void[]>;

  register(source: string, hook: 'info', listener: (args: InfoHookArgs) => Promise<InfoHookItem[]>): void;
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

export interface PromptModule {
  (question: ConfirmPromptQuestion): Promise<boolean>;
  (question: NonConfirmPromptQuestion): Promise<string>;
}

export interface IonicEnvironment {
  command?: ICommand; // root command being executed
  readonly flags: IonicEnvironmentFlags;
  readonly hooks: IHookEngine;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly daemon: IDaemon;
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
  ionic: Plugin;
  [key: string]: Plugin;
}

export type DistTag = 'testing' | 'canary' | 'latest';

export interface PluginMeta {
  filePath: string;
  name: string;
  version: string;
  distTag: DistTag;
  latestVersion?: string;
  updateAvailable?: boolean;
}

export interface Plugin {
  registerHooks(hooks: IHookEngine): void;
  meta: PluginMeta; // set when loading plugin

  /**
   * @deprecated
   */
  version?: string;
}

export interface RootPlugin extends Plugin {
  namespace: IRootNamespace;
}

export interface INamespace {
  root: boolean;
  name: string;
  description: string;
  longDescription: string;
  namespaces: INamespaceMap;
  commands: ICommandMap;

  locate(argv: string[]): Promise<[number, string[], ICommand | INamespace]>;
  getCommandMetadataList(): Promise<HydratedCommandData[]>;
}

export interface IRootNamespace extends INamespace {
  root: true;
  name: 'ionic';

  runCommand(env: IonicEnvironment, pargv: string[], opts?: { root?: boolean; }): Promise<void>;
}

export interface ICommand {
  env: IonicEnvironment;
  metadata: CommandData;

  validate(inputs: framework.CommandLineInputs): Promise<void>;
  run(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions): Promise<void>;
  execute(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: framework.CommandLineInputs, options: framework.CommandLineOptions): Promise<void>;
}

export type NamespaceMapGetter = () => Promise<INamespace>;
export type CommandMapGetter = () => Promise<ICommand>;

export interface INamespaceMap extends Map<string, NamespaceMapGetter> {}

export interface ICommandMap extends Map<string, string | CommandMapGetter> {
  getAliases(): Map<string, string[]>;
  resolveAliases(cmdName: string): undefined | CommandMapGetter;
}

export interface ImageResource {
  platform: string;
  imageId: string | null;
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

export type KnownPlatform = 'ios' | 'android' | 'wp8';
export type KnownResourceType = 'icon' | 'splash';

export interface StarterTemplate {
  name: string;
  type: ProjectType;
  description: string;
  url: string;
  archive: string;
}

export interface StarterTemplateType {
  id: string;
  url: string;
  baseArchive: string;
  globalDependencies: string[];
  localDependencies: string[];
}

export type LiveReloadFunction = (changedFiles: string[]) => void;

export interface DevServerMessage {
  category: 'console';
  type: string;
  data: any[];
}
