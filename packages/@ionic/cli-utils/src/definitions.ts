import * as ζframework from '@ionic/cli-framework';
import { ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as ζsuperagent from 'superagent';

import * as ζbuild from './lib/build';
import * as ζgenerate from './lib/generate';
import * as ζserve from './lib/serve';

export {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadataInput,
  NamespaceMetadata,
  PackageJson,
} from '@ionic/cli-framework';

export interface SuperAgentError extends Error {
  response: ζsuperagent.Response;
}

export type LogFn = (msg: string) => void;

export interface ILogger extends ζframework.Logger {
  ok: LogFn;
  rawmsg: LogFn;
}

export interface StarterManifest {
  name: string;
  baseref: string;
  welcome?: string;
}

export interface CordovaPackageJson extends ζframework.PackageJson {
  cordova: {
    platforms: string[];
    plugins: {
      [key: string]: {};
    };
  };
}

export interface Runner<T extends object, U> {
  run(options: T): Promise<U>;
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

export type IntegrationName = 'capacitor' | 'cordova';

export interface ProjectIntegration {
  enabled?: boolean;
  root?: string;
}

export interface ProjectIntegrations {
  cordova?: ProjectIntegration;
  capacitor?: ProjectIntegration;
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

export interface IConfig extends ζframework.BaseConfig<ConfigFile> {
  getAPIUrl(): string;
  getDashUrl(): string;
  getGitHost(): string;
  getGitPort(): number;
  getHTTPConfig(): CreateRequestOptions;
}

export interface ProjectPersonalizationDetails {
  name: string;
  projectId: string;
  packageId?: string;
  version?: string;
  description?: string;
}

export interface IProjectConfig {
  name: string;
  type?: ProjectType;
  pro_id?: string;

  readonly integrations: ProjectIntegrations;
  readonly hooks?: Record<HookName, string | string[] | undefined>;

  ssl?: {
    key?: string;
    cert?: string;
  };
}

export interface MultiProjectConfig {
  defaultProject?: string;
  projects: {
    [key: string]: IProjectConfig | undefined;
  };
}

export type ProjectFile = IProjectConfig | MultiProjectConfig;

export interface IProject {
  readonly directory: string;
  readonly filePath: string;
  readonly name?: string;
  readonly type: ProjectType;
  readonly config: ζframework.BaseConfig<IProjectConfig>;

  getDocsUrl(): Promise<string>;
  getSourceDir(sourceRoot?: string): Promise<string>;
  getDistDir(): Promise<string>;
  getInfo(): Promise<InfoItem[]>;
  detected(): Promise<boolean>;
  createIntegration(name: IntegrationName): Promise<IIntegration>;
  getIntegration(name: IntegrationName): Promise<Required<ProjectIntegration>>;
  requireProId(): Promise<string>;
  getPackageJson(pkgName?: string): Promise<[ζframework.PackageJson | undefined, string | undefined]>;
  requirePackageJson(pkgName?: string): Promise<ζframework.PackageJson>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
  registerAilments(registry: IAilmentRegistry): Promise<void>;
  getBuildRunner(): Promise<ζbuild.BuildRunner<any> | undefined>;
  getServeRunner(): Promise<ζserve.ServeRunner<any> | undefined>;
  getGenerateRunner(): Promise<ζgenerate.GenerateRunner<any> | undefined>;
  requireBuildRunner(): Promise<ζbuild.BuildRunner<any>>;
  requireServeRunner(): Promise<ζserve.ServeRunner<any>>;
  requireGenerateRunner(): Promise<ζgenerate.GenerateRunner<any>>;
}

export interface IIntegrationAddOptions {
  conflictHandler?(f: string, stats: fs.Stats): Promise<boolean>;
  onFileCreate?(f: string): void;
}

export interface IIntegration {
  readonly name: IntegrationName;
  readonly summary: string;
  readonly archiveUrl?: string;

  add(opts?: IIntegrationAddOptions): Promise<void>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  getInfo(): Promise<InfoItem[]>;
  personalize(details: ProjectPersonalizationDetails): Promise<void>;
}

export interface PackageVersions {
  [key: string]: string;
}

export interface CommandMetadataOption extends ζframework.CommandMetadataOption {
  private?: boolean;
  hint?: string;
}

export interface ExitCodeException extends Error {
  exitCode: number;
}

export interface CommandMetadata extends ζframework.CommandMetadata<ζframework.CommandMetadataInput, CommandMetadataOption> {
  type: 'global' | 'project';
}

export type HydratedCommandMetadata = CommandMetadata & ζframework.HydratedCommandMetadata<ICommand, INamespace, CommandMetadata, ζframework.CommandMetadataInput, CommandMetadataOption>;
export type CommandInstanceInfo = ζframework.CommandInstanceInfo<ICommand, INamespace, CommandMetadata, ζframework.CommandMetadataInput, CommandMetadataOption>;
export type NamespaceLocateResult = ζframework.NamespaceLocateResult<ICommand, INamespace, CommandMetadata, ζframework.CommandMetadataInput, CommandMetadataOption>;

export interface ISession {
  login(email: string, password: string): Promise<void>;
  tokenLogin(token: string): Promise<void>;
  logout(): Promise<void>;

  isLoggedIn(): boolean;
  getUser(): { id: number; };
  getUserToken(): string;
}

export interface IShellSpawnOptions extends SpawnOptions {
  showCommand?: boolean;
}

export interface IShellOutputOptions extends IShellSpawnOptions {
  fatalOnError?: boolean;
  showError?: boolean;
}

export interface IShellRunOptions extends IShellOutputOptions {
  stream?: NodeJS.WritableStream;
  killOnExit?: boolean;
  fatalOnNotFound?: boolean;
  truncateErrorOutput?: number;
}

export interface IShell {
  run(command: string, args: string[], options: IShellRunOptions): Promise<void>;
  output(command: string, args: string[], options: IShellOutputOptions): Promise<string>;
  spawn(command: string, args: string[], options: IShellSpawnOptions): ChildProcess;
  cmdinfo(cmd: string, args?: string[]): Promise<string | undefined>;
}

export interface ITelemetry {
  sendCommand(command: string, args: string[]): Promise<void>;
}

export type NpmClient = 'yarn' | 'npm';

export type FeatureId = 'project-angular' | 'capacitor-commands' | 'ssl-commands';

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

  // Ionic Pro
  'urls.api'?: string;
  'urls.dash'?: string;
  'git.host'?: string;
  'git.port'?: number;
  'git.setup'?: boolean;
  'user.id'?: number;
  'user.email'?: string;
  'tokens.user'?: string;
  'tokens.telemetry'?: string;

  // Features
  'features.project-angular'?: boolean;
  'features.capacitor-commands'?: boolean;
  'features.ssl-commands'?: boolean;
}

export interface SSLConfig {
  cafile?: string | string[];
  certfile?: string | string[];
  keyfile?: string | string[];
}

export interface CreateRequestOptions {
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

export interface IClient {
  config: IConfig;

  make(method: HttpMethod, path: string): Promise<{ req: ζsuperagent.SuperAgentRequest; }>;
  do(req: ζsuperagent.SuperAgentRequest): Promise<APIResponseSuccess>;
  paginate<T extends Response<object[]>>(args: PaginateArgs<T>): IPaginator<T>;
}

export type PaginateArgs<T extends Response<object[]>> = Pick<PaginatorDeps<T>, 'reqgen' | 'guard' | 'state' | 'max'>;

export interface IPaginator<T extends Response<object[]>, S = PaginatorState> extends IterableIterator<Promise<T>> {
  readonly state: S;
}

export type PaginatorRequestGenerator = () => Promise<{ req: ζsuperagent.SuperAgentRequest; }>;
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

export type InfoItemGroup = 'ionic' | 'capacitor' | 'cordova' | 'system' | 'environment';

export interface InfoItem {
  group: InfoItemGroup;
  key: string;
  value: string;
  flair?: string;
  path?: string;
}

export interface BaseBuildOptions {
  engine: string; // browser, cordova, etc.
  platform?: string; // android, ios, etc.
  project?: string;
  '--': string[];
}

export interface BuildOptions<T extends ProjectType> extends BaseBuildOptions {
  type: T;
}

export interface AngularBuildOptions extends BuildOptions<'angular'> {
  configuration?: string;
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
  [key: string]: any; // TODO
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
  project?: string;
  '--': string[];

  // Additional Options
  externalAddressRequired?: boolean;
  engine: string; // browser, cordova, etc.
}

export interface AngularServeOptions extends ServeOptions {
  configuration?: string;
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
  externalNetworkInterfaces: ζframework.NetworkInterface[];
  externallyAccessible: boolean;
}

export interface IAilment {
  readonly id: string;
  implicit: boolean;
  projects?: ProjectType[];
  getMessage(): Promise<string>;
  detected(): Promise<boolean>;
  getTreatmentSteps(): Promise<PatientTreatmentStep[]>;
}

export interface TreatableAilment extends IAilment {
  readonly treatable: boolean;
  getTreatmentSteps(): Promise<DoctorTreatmentStep[]>;
}

export interface PatientTreatmentStep {
  message: string;
}

export interface DoctorTreatmentStep extends PatientTreatmentStep {
  treat(): Promise<void>;
}

export interface IAilmentRegistry {
  ailments: IAilment[];

  register(ailment: IAilment): void;
  get(id: string): IAilment | undefined;
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
  readonly prompt: ζframework.PromptModule;
  readonly ctx: IonicContext;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: ζframework.TaskChain;
  keepopen: boolean;

  open(): void;
  close(): void;
  getInfo(): Promise<InfoItem[]>;
}

export interface IonicEnvironmentFlags {
  interactive: boolean;
  confirm: boolean;
}

export type DistTag = 'testing' | 'canary' | 'latest';

export interface ICommand extends ζframework.ICommand<ICommand, INamespace, CommandMetadata, ζframework.CommandMetadataInput, CommandMetadataOption> {
  env: IonicEnvironment;
  project?: IProject;

  execute(inputs: ζframework.CommandLineInputs, options: ζframework.CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface CommandPreRun extends ICommand {
  preRun(inputs: ζframework.CommandLineInputs, options: ζframework.CommandLineOptions, metadata: CommandInstanceInfo): Promise<void>;
}

export interface INamespace extends ζframework.INamespace<ICommand, INamespace, CommandMetadata, ζframework.CommandMetadataInput, CommandMetadataOption> {
  env: IonicEnvironment;
  project?: IProject;
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
}

export interface ResolvedStarterTemplate extends StarterTemplate {
  archive: string;
}

export interface IPCMessage {
  type: 'telemetry';
  data: { command: string; args: string[]; };
}
