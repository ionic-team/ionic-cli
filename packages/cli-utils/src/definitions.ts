import * as crossSpawnType from 'cross-spawn';
import * as inquirerType from 'inquirer';
import * as superagentType from 'superagent';
import * as minimistType from 'minimist';

export interface SuperAgentError extends Error {
  response: superagentType.Response;
}

export type LogFn = (msg: string) => void;
export type LogLevel = 'debug' | 'info' | 'ok' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  stream?: NodeJS.WritableStream;
}

export interface ILogger {
  level: string;
  prefix: string;
  stream: NodeJS.WritableStream;

  debug: LogFn;
  info: LogFn;
  ok: LogFn;
  warn: LogFn;
  error: LogFn;
  msg: LogFn;
  nl(num?: number): void;
  shouldLog(level: LogLevel): boolean;
}

export interface ITask {
  running: boolean;

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
}

export interface PackageJson {
  name: string;
  version?: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
}

export interface BowerJson {
  name: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

export interface EnvironmentInfo {
  cordovaVersion: string;
  appScripts: string;
  xcode: string;
  iosDeploy: string;
  iosSim: string;
  ionic: string;
  cli: string;
  os: string;
  node: string;
}

export interface AppScriptsServeSettings {
  url: string;
  address: string;
  port: number;
  liveReloadPort: number;
}

export interface ProjectFileProxy {
  proxyUrl: string;
  proxyNoAgent: boolean;
  rejectUnauthorized: boolean;
  path: string;
}

export type ProjectType = 'ionic-angular' | 'ionic1';

export interface ProjectFile {
  name: string;
  type: ProjectType;
  app_id: string;
  documentRoot?: string; // www folder location (TODO: use this everywhere)
  watchPatterns?: string[]; // ionic 1 livereload watch config (TODO)
  proxies?: ProjectFileProxy[];
}

export interface Response<T> extends APIResponseSuccess {
  data: T;
}

export interface AppDetails {
  id: string;
  name: string;
  slug: string;
}

export interface AuthToken {
  token: string;
  details: {
    app_id: string;
    type: 'app-user';
    user_id: string;
  };
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
}

export interface IProject extends IConfig<ProjectFile> {
  directory: string;

  formatType(input: ProjectType): string;
  loadAppId(): Promise<string>;
  loadPackageJson(): Promise<PackageJson>;
  loadBowerJson(): Promise<BowerJson>;
}

export type CommandLineInput = string | boolean | null | undefined | string[];
export type CommandLineInputs = string[];

export interface CommandLineOptions extends minimistType.ParsedArgs {
  [arg: string]: CommandLineInput;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;
export type CommandOptionTypeDefaults = Map<CommandOptionType, CommandLineInput>;

export interface CommandOption {
  name: string;
  description: string;
  type?: CommandOptionType;
  default?: CommandLineInput;
  aliases?: string[];
  private?: boolean;
  intent?: string;
}

export interface NormalizedCommandOption extends CommandOption {
  type: CommandOptionType;
  default: CommandLineInput;
  aliases: string[];
}

export type Validator = (input?: string, key?: string) => true | string;

export interface Validators {
  required: Validator;
  email: Validator;
  numeric: Validator;
}

export interface ValidationError {
  message: string;
  inputName: string;
}

export interface CommandInput {
  name: string;
  description: string;
  validators?: Validator[];
  required?: boolean;
  private?: boolean;
}

export interface NormalizedMinimistOpts extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: CommandLineInput };
}

export interface CommandData {
  name: string;
  type: 'global' | 'project';
  description: string;
  longDescription?: string;
  exampleCommands?: string[];
  aliases?: string[];
  inputs?: CommandInput[];
  options?: CommandOption[];
  fullName?: string;
  visible?: boolean;
  source?: string;
  minimistOpts?: NormalizedMinimistOpts;
}

export interface ISession {
  login(email: string, password: string): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getUserToken(): Promise<string>;
  getAppUserToken(app_id?: string): Promise<string>;
}

export interface IShellRunOptions extends crossSpawnType.SpawnOptions {
  showCommand?: boolean;
  showExecution?: boolean;
  showError?: boolean;
  fatalOnNotFound?: boolean;
  fatalOnError?: boolean;
  truncateErrorOutput?: number;
}

export interface IShell {
  run(command: string, args: string[], options: IShellRunOptions): Promise<string>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
  sendError(error: any, type: string): Promise<void>;
}

export interface ConfigFile {
  lastCommand: string;
  urls: {
    api: string;
    dash: string;
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
  cliFlags: {
    'dev-always-plugin-updates'?: boolean;
    'dev-always-ionic-updates'?: boolean;
    confirm?: boolean;
    interactive?: boolean;
    telemetry?: boolean;
    yarn?: boolean;
    timeout?: boolean;
  };
}

export type CliFlag = keyof ConfigFile['cliFlags'];

export interface IConfig<T> {
  directory: string;
  fileName: string;
  filePath: string;

  load(): Promise<T>;
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
  make(method: HttpMethod, path: string): superagentType.SuperAgentRequest;
  do(req: superagentType.SuperAgentRequest): Promise<APIResponseSuccess>;
  paginate<T extends Response<Object[]>>(reqgen: () => superagentType.SuperAgentRequest, guard: (res: APIResponseSuccess) => res is T): IPaginator<T>;
}

export interface IPaginator<T extends Response<Object[]>> extends IterableIterator<Promise<T>> {}

export interface HookArgs {
  env: IonicEnvironment;
}

export interface CommandHookArgs extends HookArgs {
  cmd: ICommand;
  inputs: CommandLineInputs;
  options: CommandLineOptions;
}

export interface InfoHookItem {
  type: 'system' | 'global-packages' | 'local-packages';
  name: string;
  version: string;
}

export interface IHook<T, U> {
  source: string;
  name: string;

  fire(args: T): Promise<U>;
}

export interface IHookEngine {
  fire(hook: 'plugins:init', args: HookArgs): Promise<void[]>;
  fire(hook: 'command:docs', args: CommandHookArgs): Promise<string[]>;
  fire(hook: 'command:generate', args: CommandHookArgs): Promise<void[]>;
  fire(hook: 'command:info', args: CommandHookArgs): Promise<InfoHookItem[][]>;
  fire(hook: 'command:build', args: CommandHookArgs): Promise<void[]>;
  fire(hook: 'command:serve', args: CommandHookArgs): Promise<{ [key: string]: any }[]>;

  register(source: string, hook: 'plugins:init', listener: (args: HookArgs) => Promise<void>): void;
  register(source: string, hook: 'command:docs', listener: (args: CommandHookArgs) => Promise<string>): void;
  register(source: string, hook: 'command:generate', listener: (args: CommandHookArgs) => Promise<void>): void;
  register(source: string, hook: 'command:info', listener: (args: CommandHookArgs) => Promise<InfoHookItem[]>): void;
  register(source: string, hook: 'command:build', listener: (args: CommandHookArgs) => Promise<void>): void;
  register(source: string, hook: 'command:serve', listener: (args: CommandHookArgs) => Promise<{ [key: string]: any }>): void;

  getSources(hook: string): string[];
  hasSources(hook: string, sources: string[]): boolean;
  deleteSource(source: string): void;

  getRegistered<T, U>(hook: string): IHook<T, U>[];
}

export interface PromptQuestion extends inquirerType.Question {
  type: 'input' | 'password' | 'confirm' | 'list'; // strong-type type
  message: string; // message is required
  name: string; // name is required
  noninteractiveValue?: string; // in non-interactive mode, what does this return?
}

export interface PromptModule {
  (questions: PromptQuestion): Promise<string>;
}

export interface IonicEnvironment {
  argv: minimistType.ParsedArgs;
  pargv: string[];
  app: IApp;
  hooks: IHookEngine;
  client: IClient;
  config: IConfig<ConfigFile>; // CLI global config (~/.ionic/config.json)
  log: ILogger;
  prompt: PromptModule;
  project: IProject; // project config (ionic.config.json)
  plugins: {
    ionic: Plugin;
    [key: string]: Plugin;
  };
  session: ISession;
  shell: IShell;
  tasks: ITaskChain;
  telemetry: ITelemetry;
  namespace: INamespace;

  close(): void;
  load(modulePath: 'superagent'): typeof superagentType;
}

export interface PluginMeta {
  filePath: string;
}

export interface Plugin {
  name: string;
  version: string;
  preferGlobal?: boolean;
  namespace?: INamespace;
  registerHooks?(hooks: IHookEngine): void;
  meta?: PluginMeta; // set when loading plugin
}

export type DistTag = 'local' | 'canary' | 'beta' | 'latest';

export interface HydratedPlugin extends Plugin {
  distTag: DistTag;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  meta: PluginMeta;
}

export interface INamespace {
  root: boolean;
  name: string;
  namespaces: INamespaceMap;
  commands: ICommandMap;
  source: string;

  locate(argv: string[]): [number, string[], ICommand | INamespace];
  getCommandMetadataList(): CommandData[];
}

export interface ICommand {
  env: IonicEnvironment;
  metadata: CommandData;

  validate(inputs: CommandLineInputs): Promise<void>;
  run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number>;
  execute(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number>;
}

export type NamespaceMapGetter = () => INamespace;
export type CommandMapGetter = () => ICommand;

export interface INamespaceMap extends Map<string, NamespaceMapGetter> {}

export interface ICommandMap extends Map<string, string | CommandMapGetter> {
  getAliases(): Map<string, string[]>;
  resolveAliases(cmdName: string): undefined | CommandMapGetter;
}
