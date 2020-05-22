import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  App,
  AppAssociation,
  BitbucketCloudRepoAssociation,
  BitbucketServerRepoAssociation,
  CommandPreRun,
  CordovaAndroidBuildOutputEntry,
  CordovaPackageJson,
  ExitCodeException,
  GithubBranch,
  GithubRepo,
  GithubRepoAssociation,
  ICommand,
  IMultiProjectConfig,
  IProjectConfig,
  IntegrationName,
  Login,
  OpenIdToken,
  Org,
  Response,
  SSHKey,
  SecurityProfile,
  Snapshot,
  StarterManifest,
  SuperAgentError,
  TreatableAilment,
  User
} from './definitions';
import { AuthConnection } from './lib/oauth/auth';

export const INTEGRATION_NAMES: IntegrationName[] = ['capacitor', 'cordova', 'enterprise'];

export function isCommand(cmd: any): cmd is ICommand {
  return cmd && typeof cmd.run === 'function';
}

export function isCommandPreRun(cmd: any): cmd is CommandPreRun {
  return cmd && typeof cmd.preRun === 'function';
}

export function isStarterManifest(obj: any): obj is StarterManifest {
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.baseref === 'string';
}

export function isCordovaPackageJson(obj: any): obj is CordovaPackageJson {
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.cordova === 'object' &&
    Array.isArray(obj.cordova.platforms) &&
    typeof obj.cordova.plugins === 'object';
}

export function isCordovaAndroidBuildOutputFile(obj: any): obj is CordovaAndroidBuildOutputEntry[] {
  if (!Array.isArray(obj)) {
    return false;
  }

  if (obj.length === 0) {
    return true;
  }

  return obj[0]
    && typeof obj[0].path === 'string'
    && typeof obj[0].outputType === 'object'
    && typeof obj[0].outputType.type === 'string';
}

export function isExitCodeException(err: any): err is ExitCodeException {
  return err && typeof err.exitCode === 'number' && err.exitCode >= 0 && err.exitCode <= 255;
}

export function isSuperAgentError(err: any): err is SuperAgentError {
  return err && err.response && typeof err.response === 'object';
}

export function isAPIResponseSuccess(res: any): res is APIResponseSuccess {
  return res && (typeof res.data === 'object' || typeof res.data === 'string');
}

export function isAPIResponseError(res: any): res is APIResponseError {
  return res && typeof res.error === 'object';
}

export function isOrg(org: any): org is Org {
  return org && typeof org.name === 'string';
}

export function isGithubRepo(repo: any): repo is GithubRepo {
  return repo
    && typeof repo.full_name === 'string'
    && typeof repo.id === 'number';
}

export function isGithubBranch(branch: any): branch is GithubBranch {
  return branch && typeof branch.name === 'string';
}

export function isGithubRepoListResponse(res: any): res is Response<GithubRepo[]> {
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length === 0) {
    return true;
  }

  return isGithubRepo(res.data[0]);
}

export function isGithubBranchListResponse(res: any): res is Response<GithubBranch[]> {
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length === 0) {
    return true;
  }

  return isGithubBranch(res.data[0]);
}

export function isAppAssociation(association: any): association is AppAssociation {
  return (
    association &&
    typeof association.repository === 'object' &&
    typeof association.repository.html_url === 'string' &&
    (
      isGithubRepoAssociation(association.repository) ||
      isBitbucketCloudRepoAssociation(association.repository) ||
      isBitbucketServerRepoAssociation(association.repository)
    )
  );
}

export function isAppAssociationResponse(res: APIResponse): res is Response<AppAssociation> {
  return isAPIResponseSuccess(res)
    && typeof res.data === 'object'
    && isAppAssociation(res.data);
}

export function isGithubRepoAssociation(association: any): association is GithubRepoAssociation {
  return association
    && association.type === 'github'
    && typeof association.id === 'number';
}

export function isBitbucketCloudRepoAssociation(association: any): association is BitbucketCloudRepoAssociation {
  return association
    && association.type === 'bitbucket_cloud'
    && typeof association.id === 'string';
}

export function isBitbucketServerRepoAssociation(association: any): association is BitbucketServerRepoAssociation {
  return association
    && association.type === 'bitbucket_server'
    && typeof association.id === 'number';
}

export function isApp(app: any): app is App {
  return app
    && typeof app === 'object'
    && typeof app.id === 'string'
    && typeof app.name === 'string'
    && typeof app.slug === 'string'
    && (!app.org || isOrg(app.org))
    && (!app.association || isAppAssociation(app.association));
}

export function isAppResponse(res: APIResponse): res is Response<App> {
  return isAPIResponseSuccess(res)
    && typeof res.data === 'object'
    && isApp(res.data);
}

export function isAppsResponse(res: APIResponse): res is Response<App[]> {
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length === 0) {
    return true;
  }

  return isApp(res.data[0]);
}

export interface OAuthLogin {
  redirect_url: string;
}

export function isOAuthLogin(login: any): login is OAuthLogin {
  return login && typeof login.redirect_url === 'string';
}

export function isOAuthLoginResponse(res: any): res is Response<OAuthLogin> {
  return isAPIResponseSuccess(res) && isOAuthLogin(res.data);
}

export function isOpenIDToken(tokenObj: any): tokenObj is OpenIdToken {
  return tokenObj
    && typeof tokenObj.access_token === 'string'
    && typeof tokenObj.expires_in === 'number'
    && (tokenObj.id_token ? typeof tokenObj.id_token === 'string' : true)
    && (tokenObj.refresh_token ? typeof tokenObj.refresh_token === 'string' : true)
    && tokenObj.scope === 'openid profile email offline_access'
    && tokenObj.token_type === 'Bearer';
}

export function isOpenIDTokenExchangeResponse(res: any): res is Response<OpenIdToken> {
  return res && typeof res.body === 'object' && isOpenIDToken(res.body);
}

export function isSnapshot(snapshot: any): snapshot is Snapshot {
  return snapshot
    && typeof snapshot.id === 'string'
    && typeof snapshot.sha === 'string'
    && typeof snapshot.ref === 'string'
    && typeof snapshot.state === 'string'
    && typeof snapshot.created === 'string'
    && typeof snapshot.note === 'string';
}

export function isSnapshotResponse(res: APIResponse): res is Response<Snapshot> {
  return isAPIResponseSuccess(res) && isSnapshot(res.data);
}

export function isSnapshotListResponse(res: APIResponse): res is Response<Snapshot[]> {
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length === 0) {
    return true;
  }

  return isSnapshot(res.data[0]);
}

export function isLogin(login: any): login is Login {
  return login
    && isUser(login.user)
    && typeof login.token === 'string';
}

export function isLoginResponse(res: APIResponse): res is Response<Login> {
  return isAPIResponseSuccess(res) && isLogin(res.data);
}

export function isAuthConnection(connection: any): connection is AuthConnection {
  return connection && typeof connection.uuid === 'string';
}

export function isAuthConnectionResponse(res: APIResponse): res is Response<AuthConnection> {
  return isAPIResponseSuccess(res) && isAuthConnection(res.data);
}

export function isUser(user: any): user is User {
  return user
    && typeof user.id === 'number'
    && typeof user.email === 'string';
}

export function isUserResponse(res: APIResponse): res is Response<User> {
  return isAPIResponseSuccess(res) && isUser(res.data);
}

export function isSSHKey(key: any): key is SSHKey {
  return key
    && typeof key.id === 'string'
    && typeof key.pubkey === 'string'
    && typeof key.fingerprint === 'string'
    && typeof key.annotation === 'string'
    && typeof key.name === 'string'
    && typeof key.created === 'string'
    && typeof key.updated === 'string';
}

export function isSSHKeyListResponse(res: APIResponse): res is Response<SSHKey[]> {
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length === 0) {
    return true;
  }

  return isSSHKey(res.data[0]);
}

export function isSSHKeyResponse(res: APIResponse): res is Response<SSHKey> {
  return isAPIResponseSuccess(res) && isSSHKey(res.data);
}

export function isSecurityProfile(obj: any): obj is SecurityProfile {
  return obj
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

export function isTreatableAilment(ailment: any): ailment is TreatableAilment {
  return ailment && ailment.treatable && typeof ailment.getTreatmentSteps === 'function';
}

export function isIntegrationName(name: any): name is IntegrationName {
  return INTEGRATION_NAMES.includes(name);
}

export function isProjectConfig(configFile: any): configFile is IProjectConfig {
  return configFile
    && typeof configFile.name === 'string'
    && typeof configFile.projects === 'undefined';
}

export function isMultiProjectConfig(configFile: any): configFile is IMultiProjectConfig {
  return configFile
    && typeof configFile.name === 'undefined'
    && typeof configFile.projects === 'object';
}
