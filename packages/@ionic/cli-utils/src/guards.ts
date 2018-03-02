import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  AngularCLIJson,
  App,
  AppAssociation,
  CommandPreRun,
  CordovaPackageJson,
  ExitCodeException,
  GithubRepo,
  IAutomaticallyTreatableAilment,
  ICommand,
  IntegrationName,
  LogLevel,
  Login,
  Org,
  Plugin,
  Response,
  SSHKey,
  SecurityProfile,
  Snapshot,
  StarterManifest,
  SuperAgentError,
  User,
} from './definitions';

export const LOG_LEVELS: LogLevel[] = ['info', 'msg', 'ok', 'warn', 'error', 'announce'];
export const INTEGRATION_NAMES: IntegrationName[] = ['cordova'];

export function isCommand(c: object): c is ICommand {
  const cmd = <ICommand>c;
  return cmd && typeof cmd.run === 'function';
}

export function isCommandPreRun(c: ICommand): c is CommandPreRun {
  const cmd = <CommandPreRun>c;
  return cmd && typeof cmd.preRun === 'function';
}

export function isLogLevel(l: string): l is LogLevel {
  const loglevel = <LogLevel>l;
  return LOG_LEVELS.includes(loglevel);
}

export function isStarterManifest(o: object): o is StarterManifest {
  const obj = <StarterManifest>o;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.baseref === 'string';
}

export function isCordovaPackageJson(o: object): o is CordovaPackageJson {
  const obj = <CordovaPackageJson>o;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.cordova === 'object' &&
    typeof obj.cordova.platforms === 'object' &&
    typeof obj.cordova.plugins === 'object';
}

export function isAngularCLIJson(o: object): o is AngularCLIJson {
  const obj = <AngularCLIJson>o;
  return obj &&
    typeof obj.project === 'object' &&
    typeof obj.project.name === 'string';
}

export function isExitCodeException(e: Error): e is ExitCodeException {
  const err = <any>e;
  return err && typeof err.exitCode === 'number' && err.exitCode >= 0 && err.exitCode <= 255;
}

export function isPlugin(p: any): p is Plugin {
  return p && (typeof p.getInfo === 'undefined' || typeof p.getInfo === 'function');
}

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  const res = <APIResponseSuccess>r;
  return res && (typeof res.data === 'object' || typeof res.data === 'string');
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  const res = <APIResponseError>r;
  return res && typeof res.error === 'object';
}

export function isOrg(o: object): o is Org {
  const org = <Org>o;
  return org && typeof org.name === 'string';
}

export function isGithubRepo(r: object): r is GithubRepo {
  const repo = <GithubRepo>r;
  return repo
    && typeof repo.full_name === 'string'
    && typeof repo.id === 'number';
}

export function isGithubRepoListResponse(r: APIResponse): r is Response<GithubRepo[]> {
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (r.data.length === 0) {
    return true;
  }

  return typeof r.data[0] === 'object' && isGithubRepo(r.data[0]);
}

export function isAppAssociation(a: object): a is AppAssociation {
  const association = <AppAssociation>a;
  return association
    && typeof association.repository === 'object'
    && typeof association.repository.type === 'string'
    && typeof association.repository.github_id === 'number'
    && typeof association.repository.html_url === 'string';
}

export function isAppAssociationResponse(r: APIResponse): r is Response<AppAssociation> {
  return isAPIResponseSuccess(r)
    && typeof r.data === 'object'
    && isAppAssociation(r.data);
}

export function isApp(d: object): d is App {
  const details = <App>d;
  return details
    && typeof details === 'object'
    && typeof details.id === 'string'
    && typeof details.name === 'string'
    && typeof details.slug === 'string'
    && (!details.org || isOrg(details.org))
    && (!details.association || isAppAssociation(details.association));
}

export function isAppResponse(r: APIResponse): r is Response<App> {
  return isAPIResponseSuccess(r)
    && typeof r.data === 'object'
    && isApp(r.data);
}

export function isAppsResponse(r: APIResponse): r is Response<App[]> {
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (r.data.length === 0) {
    return true;
  }

  return typeof r.data[0] === 'object' && isApp(r.data[0]);
}

export interface OAuthLogin {
  redirect_url: string;
}

export function isOAuthLoginResponse(r: APIResponse): r is Response<OAuthLogin> {
  const res = <Response<OAuthLogin>>r;
  return isAPIResponseSuccess(res) && typeof res.data === 'object' && typeof res.data.redirect_url === 'string';
}

export function isSnapshot(s: object): s is Snapshot {
  const snapshot = <Snapshot>s;
  return snapshot
    && typeof snapshot.id === 'string'
    && typeof snapshot.sha === 'string'
    && typeof snapshot.ref === 'string'
    && typeof snapshot.state === 'string'
    && typeof snapshot.created === 'string'
    && typeof snapshot.note === 'string';
}

export function isSnapshotResponse(r: APIResponse): r is Response<Snapshot> {
  const res = <Response<Snapshot>>r;
  return isAPIResponseSuccess(res) && isSnapshot(res.data);
}

export function isSnapshotListResponse(r: APIResponse): r is Response<Snapshot[]> {
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (r.data.length === 0) {
    return true;
  }

  return typeof r.data[0] === 'object' && isSnapshot(r.data[0]);
}

export function isLogin(l: object): l is Login {
  const login = <Login>l;
  return login
    && isUser(login.user)
    && typeof login.token === 'string';
}

export function isLoginResponse(r: APIResponse): r is Response<Login> {
  const res = <APIResponseSuccess>r;
  return isAPIResponseSuccess(res)
    && typeof res.data === 'object'
    && isLogin(res.data);
}

export function isUser(u: object): u is User {
  const user = <User>u;
  return user
    && typeof user.id === 'number'
    && typeof user.email === 'string';
}

export function isUserResponse(r: APIResponse): r is Response<User> {
  return isAPIResponseSuccess(r)
    && typeof r.data === 'object'
    && isUser(r.data);
}

export function isSSHKey(k: object): k is SSHKey {
  const key = <SSHKey>k;
  return key
    && typeof key.id === 'string'
    && typeof key.pubkey === 'string'
    && typeof key.fingerprint === 'string'
    && typeof key.annotation === 'string'
    && typeof key.name === 'string'
    && typeof key.created === 'string'
    && typeof key.updated === 'string';
}

export function isSSHKeyListResponse(r: APIResponse): r is Response<SSHKey[]> {
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (r.data.length === 0) {
    return true;
  }

  return typeof r.data[0] === 'object' && isSSHKey(r.data[0]);
}

export function isSSHKeyResponse(r: APIResponse): r is Response<SSHKey> {
  return isAPIResponseSuccess(r)
    && typeof r.data === 'object'
    && isSSHKey(r.data);
}

export function isSecurityProfile(o: object): o is SecurityProfile {
  const obj = <SecurityProfile>o;
  return obj && typeof obj === 'object'
    && typeof obj.name === 'string'
    && typeof obj.tag === 'string'
    && typeof obj.type === 'string'
    && typeof obj.created === 'string'
    && typeof obj.credentials === 'object';
}

export function isSecurityProfileResponse(r: APIResponse): r is Response<SecurityProfile> {
  const res = <Response<SecurityProfile>>r;
  return isAPIResponseSuccess(res) && isSecurityProfile(res.data);
}

export function isAutomaticallyTreatableAilment(ailment: any): ailment is IAutomaticallyTreatableAilment {
  return ailment && typeof ailment.treat === 'function';
}

export function isIntegrationName(name: string): name is IntegrationName {
  const n = <IntegrationName>name;
  return INTEGRATION_NAMES.includes(n);
}
