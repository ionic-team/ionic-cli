import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  App,
  AppAssociation,
  CommandPreRun,
  CordovaPackageJson,
  ExitCodeException,
  GithubBranch,
  GithubRepo,
  GithubRepoAssociation,
  ICommand,
  IProjectConfig,
  IntegrationName,
  Login,
  MultiProjectConfig,
  Org,
  Response,
  SSHKey,
  SecurityProfile,
  Snapshot,
  StarterManifest,
  SuperAgentError,
  TreatableAilment,
  User,
} from './definitions';

export const INTEGRATION_NAMES: IntegrationName[] = ['capacitor', 'cordova'];

export function isCommand(c: object): c is ICommand {
  const cmd = c as ICommand;
  return cmd && typeof cmd.run === 'function';
}

export function isCommandPreRun(c: ICommand): c is CommandPreRun {
  const cmd = c as CommandPreRun;
  return cmd && typeof cmd.preRun === 'function';
}

export function isStarterManifest(o: object): o is StarterManifest {
  const obj = o as StarterManifest;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.baseref === 'string';
}

export function isCordovaPackageJson(o: object): o is CordovaPackageJson {
  const obj = o as CordovaPackageJson;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.cordova === 'object' &&
    typeof obj.cordova.platforms === 'object' &&
    typeof obj.cordova.plugins === 'object';
}

export function isExitCodeException(e: Error): e is ExitCodeException {
  const err = e as any;
  return err && typeof err.exitCode === 'number' && err.exitCode >= 0 && err.exitCode <= 255;
}

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err = e as SuperAgentError;
  return e && err.response && typeof err.response === 'object';
}

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  const res = r as APIResponseSuccess;
  return res && (typeof res.data === 'object' || typeof res.data === 'string');
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  const res = r as APIResponseError;
  return res && typeof res.error === 'object';
}

export function isOrg(o: object): o is Org {
  const org = o as Org;
  return org && typeof org.name === 'string';
}

export function isGithubRepo(r: object): r is GithubRepo {
  const repo = r as GithubRepo;
  return repo
    && typeof repo.full_name === 'string'
    && typeof repo.id === 'number';
}

export function isGithubBranch(r: object): r is GithubBranch {
  const branch = r as GithubBranch;
  return branch
    && typeof branch.name === 'string';
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

export function isGithubBranchListResponse(r: APIResponse): r is Response<GithubBranch[]> {
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (r.data.length === 0) {
    return true;
  }

  return typeof r.data[0] === 'object' && isGithubBranch(r.data[0]);
}

export function isAppAssociation(a: object): a is AppAssociation {
  const association = a as AppAssociation;
  return association
    && typeof association.repository === 'object'
    && typeof association.repository.html_url === 'string'
    && isGithubRepoAssociation(association.repository);
}

export function isAppAssociationResponse(r: APIResponse): r is Response<AppAssociation> {
  return isAPIResponseSuccess(r)
    && typeof r.data === 'object'
    && isAppAssociation(r.data);
}

export function isGithubRepoAssociation(a: object): a is GithubRepoAssociation {
  const repo = a as GithubRepoAssociation;
  return repo
    && repo.type === 'github'
    && typeof repo.id === 'number';
}

export function isApp(d: object): d is App {
  const details = d as App;
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
  const res = r as Response<OAuthLogin>;
  return isAPIResponseSuccess(res) && typeof res.data === 'object' && typeof res.data.redirect_url === 'string';
}

export function isSnapshot(s: object): s is Snapshot {
  const snapshot = s as Snapshot;
  return snapshot
    && typeof snapshot.id === 'string'
    && typeof snapshot.sha === 'string'
    && typeof snapshot.ref === 'string'
    && typeof snapshot.state === 'string'
    && typeof snapshot.created === 'string'
    && typeof snapshot.note === 'string';
}

export function isSnapshotResponse(r: APIResponse): r is Response<Snapshot> {
  const res = r as Response<Snapshot>;
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
  const login = l as Login;
  return login
    && isUser(login.user)
    && typeof login.token === 'string';
}

export function isLoginResponse(r: APIResponse): r is Response<Login> {
  const res = r as APIResponseSuccess;
  return isAPIResponseSuccess(res)
    && typeof res.data === 'object'
    && isLogin(res.data);
}

export function isUser(u: object): u is User {
  const user = u as User;
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
  const key = k as SSHKey;
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
  const obj = o as SecurityProfile;
  return obj && typeof obj === 'object'
    && typeof obj.name === 'string'
    && typeof obj.tag === 'string'
    && typeof obj.type === 'string'
    && typeof obj.created === 'string'
    && typeof obj.credentials === 'object';
}

export function isSecurityProfileResponse(r: APIResponse): r is Response<SecurityProfile> {
  const res = r as Response<SecurityProfile>;
  return isAPIResponseSuccess(res) && isSecurityProfile(res.data);
}

export function isTreatableAilment(a: object): a is TreatableAilment {
  const ailment = a as TreatableAilment;
  return ailment && ailment.treatable && typeof ailment.getTreatmentSteps === 'function';
}

export function isIntegrationName(name: string): name is IntegrationName {
  const n = name as IntegrationName;
  return INTEGRATION_NAMES.includes(n);
}

export function isProjectConfig(configFile?: object): configFile is IProjectConfig {
  return configFile !== undefined && !configFile.hasOwnProperty('projects');
}

export function isMultiProjectConfig(configFile?: object): configFile is MultiProjectConfig {
  return configFile !== undefined && configFile.hasOwnProperty('projects');
}
