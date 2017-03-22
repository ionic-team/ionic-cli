import * as child_process from 'cross-spawn';
import * as inquirer from 'inquirer';
import * as superagent from 'superagent';

export interface SuperAgentError extends Error {
  response: superagent.Response;
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
  msg: Function;
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
  choices?: inquirer.ChoiceType[] | ((answers: inquirer.Answers) => inquirer.ChoiceType[]);
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

export interface IShellRunOptions extends child_process.SpawnOptions {
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
  make(method: HttpMethod, path: string): superagent.Request;
  do(res: superagent.Request): Promise<APIResponseSuccess>;
}

export interface EventEnvironment {
  app: IApp;
  client: IClient;
  config: IConfig<ConfigFile>;
  log: ILogger;
  project: IProject;
  session: ISession;
  shell: IShell;
  telemetry: ITelemetry;
  inquirer: typeof inquirer;
}

export type EmitEventFn = (eventName: string, options: { [key: string]: any }) => Promise<any>;

export interface IonicEnvironment {
  pargv: string[];
  app: IApp;
  client: IClient;
  config: IConfig<ConfigFile>;
  log: ILogger;
  project: IProject;
  session: ISession;
  shell: IShell;
  telemetry: ITelemetry;
  inquirer: typeof inquirer;
  emitEvent: EmitEventFn;
  namespace?: INamespace;
  pluginName?: string;
}

export interface INamespace {
  getNamespaces(): INamespaceMap;
  getCommands(): ICommandMap;
  locateCommand(argv: string[]): [string[], ICommand | undefined];
}

export interface ICommand {
  env: IonicEnvironment;
  metadata: CommandData;

  load(): Promise<void>;
  unload(): Promise<void>;
  prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number>;
  run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number>;
  execute(inputs?: CommandLineInputs): Promise<void>;
}

export interface INamespaceMap extends Map<string, INamespace> {}
export interface ICommandMap extends Map<string, ICommand> {}
