import * as crossSpawnType from 'cross-spawn';
import * as inquirerType from 'inquirer';
import * as superagentType from 'superagent';
import * as minimistType from 'minimist';

export interface SuperAgentError extends Error {
  response: superagentType.Response;
}

export type LogFn = (message?: any, ...args: any[]) => void;

export type LogLevel = 'debug' | 'info' | 'ok' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

export interface ILogger {
  level: string;
  prefix: string;

  debug: LogFn;
  info: LogFn;
  ok: LogFn;
  warn: LogFn;
  error: LogFn;
  msg: LogFn;
  nl(num?: number): void;
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

export interface ProjectFile {
  name: string;
  app_id: string;
  v2: boolean;
  proxies?: ProjectFileProxy[];
}

export interface AppDetails {
  id: string;
  name: string;
  slug: string;
}

export interface AppResponse extends APIResponseSuccess {
  data: AppDetails;
}

export interface AuthTokenResponse extends APIResponseSuccess {
  data: {
    token: string;
    details: {
      app_id: string;
      type: 'app-user';
      user_id: string;
    };
  }[];
}

export interface LoginResponse extends APIResponseSuccess {
  data: {
    token: string;
  };
}

export interface DeploySnapshotRequest {
  uuid: string;
  presigned_post: {
    url: string;
    fields: Object;
  };
}

export interface DeploySnapshotRequestResponse extends APIResponseSuccess {
  data: DeploySnapshotRequest;
}

export interface DeployChannel {
  uuid: string;
  tag: string;
}

export interface DeployChannelResponse extends APIResponseSuccess {
  data: DeployChannel;
}

export interface Deploy {
  uuid: string;
  snapshot: string;
  channel: string;
}

export interface DeployResponse extends APIResponseSuccess {
  data: Deploy;
}

export interface PackageBuild {
  id: number;
  name: string;
  created: string;
  completed: string | null;
  platform: 'android' | 'ios';
  status: 'SUCCESS' | 'FAILED' | 'QUEUED' | 'BUILDING';
  mode: string;
  url?: string | null;
  output?: string | null;
}

export interface PackageBuildResponse extends APIResponseSuccess {
  data: PackageBuild;
}

export interface PackageBuildsResponse extends APIResponseSuccess {
  data: PackageBuild[];
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

export interface SecurityProfileResponse extends APIResponseSuccess {
  data: SecurityProfile;
}

export interface SecurityProfilesResponse extends APIResponseSuccess {
  data: SecurityProfile[];
}

export interface IApp {
  load(app_id?: string): Promise<AppDetails>;
}

export interface IProject extends IConfig<ProjectFile> {
  directory: string;

  loadAppId(): Promise<string>;
}

export type CommandLineInput = string | boolean | null | undefined | string[];
export type CommandLineInputs = string[];
export type CommandLineOptions = { [arg: string]: CommandLineInput };
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

export type Validator = (input: string, key?: string) => boolean | string;

export interface Validators {
  required: Validator;
  email: Validator;
}

export interface ValidationError {
  message: string;
  inputName: string;
}

export interface CommandInputPrompt {
  type?: string;
  message?: string;
  choices?: inquirerType.ChoiceType[] | ((answers: inquirerType.Answers) => inquirerType.ChoiceType[]);
  filter?(input: string): string;
}

export interface CommandInput {
  name: string;
  description: string;
  prompt?: CommandInputPrompt;
  validators?: Validator[];
  private?: boolean;
}

export interface CommandData {
  name: string;
  description: string;
  exampleCommands?: string[];
  aliases?: string[];
  inputs?: CommandInput[];
  options?: CommandOption[];
  fullName?: string;
  unlisted?: boolean;
  requiresProject?: boolean;
}

export interface ISession {
  login(email: string, password: string): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  getUserToken(): Promise<string>;
  getAppUserToken(app_id?: string): Promise<string>;
}

export interface IShellRunOptions extends crossSpawnType.SpawnOptions {
  showExecution?: boolean;
  showError?: boolean;
  fatal?: boolean;
}

export interface IShell {
  run(command: string, args?: string[], options?: IShellRunOptions): Promise<string>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
  sendError(error: any, type: string): Promise<void>;
}

export interface ConfigFile {
  lastUpdated: string;
  urls: {
    api: string;
  };
  tokens: {
    user?: string;
    telemetry?: string;
    appUser: { [app_id: string]: string };
  };
  cliFlags: {
    promptedForSignup?: boolean;
    promptedForTelemetry?: boolean;
    enableTelemetry?: boolean;
  };
}

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
  make(method: HttpMethod, path: string): superagentType.Request;
  do(res: superagentType.Request): Promise<APIResponseSuccess>;
}

export interface CLIEventEmitterBuildEventArgs {
  options: CommandLineOptions;
}

export interface CLIEventEmitterGenerateEventArgs {
  inputs: CommandLineInputs;
  options: CommandLineOptions;
}

export interface CLIEventEmitterServeEventArgs {
  env: IonicEnvironment;
  options: CommandLineOptions;
}

export interface ICLIEventEmitter {
  emit(evt: 'generate', args: CLIEventEmitterGenerateEventArgs): Promise<void[]>;
  emit(evt: 'build', args: CLIEventEmitterBuildEventArgs): Promise<void[]>;
  emit(evt: 'serve', args: CLIEventEmitterServeEventArgs): Promise<{ [key: string]: any }[]>;
  emit<T, U>(evt: string, args: T): Promise<U[]>;

  on(evt: 'generate', listener: (args: CLIEventEmitterGenerateEventArgs) => Promise<void>): this;
  on(evt: 'build', listener: (args: CLIEventEmitterBuildEventArgs) => Promise<void>): this;
  on(evt: 'serve', listener: (args: CLIEventEmitterServeEventArgs) => Promise<{ [key: string]: any }>): this;
  on<T, U>(evt: string, listener: (args: T) => Promise<U>): this;

  getListeners<T, U>(evt: string): ((args: T) => Promise<U>)[];
}

export interface IonicEnvironment {
  argv: minimistType.ParsedArgs;
  pargv: string[];
  app: IApp;
  emitter: ICLIEventEmitter;
  client: IClient;
  config: IConfig<ConfigFile>;
  log: ILogger;
  project: IProject;
  session: ISession;
  shell: IShell;
  telemetry: ITelemetry;
  namespace: INamespace;
}

export interface Plugin {
  namespace?: INamespace;
  registerEvents?(emitter: ICLIEventEmitter): void;
}

export interface INamespace {
  name: string;
  namespaces: INamespaceMap;
  commands: ICommandMap;

  locate(argv: string[]): [string[], ICommand | INamespace];
  getCommandMetadataList(): CommandData[];
}

export interface ICommand {
  env: IonicEnvironment;
  metadata: CommandData;

  showHelp(): void;
  validate(inputs: CommandLineInputs): ValidationError[];
  run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number>;
  execute(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
}

export interface CommandPreInputs extends ICommand {
  preInputs(): void;
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
