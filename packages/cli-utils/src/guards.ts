import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  AppDetails,
  AppResponse,
  AppsResponse,
  AuthTokenResponse,
  CommandPreInputs,
  CommandPreRun,
  DeployChannelResponse,
  DeployResponse,
  DeploySnapshotRequestResponse,
  DeploySnapshotResponse,
  ICommand,
  INamespace,
  LogLevel,
  LoginResponse,
  PackageBuild,
  PackageBuildResponse,
  PackageBuildsResponse,
  PackageProjectRequestResponse,
  SecurityProfile,
  SecurityProfileResponse,
  SecurityProfilesResponse,
  SuperAgentError,
  ValidationError,
} from './definitions';

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'ok', 'warn', 'error'];

export function isCommand(cmd: ICommand | INamespace): cmd is ICommand {
  return typeof (<ICommand>cmd).run === 'function';
}

export function isCommandPreRun(cmd: ICommand): cmd is CommandPreRun {
  return typeof (<CommandPreRun>cmd).preRun === 'function';
}

export function isCommandPreInputs(cmd: ICommand): cmd is CommandPreInputs {
  return typeof (<CommandPreInputs>cmd).preInputs === 'function';
}

export function isLogLevel(l: string): l is LogLevel {
  const loglevel: LogLevel = <LogLevel>l;
  return LOG_LEVELS.includes(loglevel);
}

export function isValidationErrorArray(e: Object[]): e is ValidationError[] {
  const err = <ValidationError[]>e;
  return err && err[0]
    && typeof err[0].message === 'string'
    && typeof err[0].inputName === 'string';
}

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err: SuperAgentError = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  const res: APIResponseSuccess = <APIResponseSuccess>r;
  return res && (typeof res.data === 'object' || typeof res.data === 'string');
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  const res: APIResponseError = <APIResponseError>r;
  return res && typeof res.error === 'object';
}

export function isAppDetails(d: Object): d is AppDetails {
  const details: AppDetails = <AppDetails>d;
  return details && typeof details === 'object'
    && typeof details.id === 'string'
    && typeof details.name === 'string'
    && typeof details.slug === 'string';
}

export function isAppResponse(r: APIResponse): r is AppResponse {
  const res: AppResponse = <AppResponse>r;
  return isAPIResponseSuccess(res) && isAppDetails(res.data);
}

export function isAppsResponse(r: APIResponse): r is AppsResponse {
  let res: AppsResponse = <AppsResponse>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isAppDetails(res.data[0]);
  }

  return true;
}

export function isAuthTokenResponse(r: APIResponse): r is AuthTokenResponse {
  const res: AuthTokenResponse = <AuthTokenResponse>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return typeof res.data[0].token === 'string'
      && typeof res.data[0].details === 'object'
      && typeof res.data[0].details.app_id === 'string'
      && typeof res.data[0].details.type === 'string'
      && typeof res.data[0].details.user_id === 'string';
  }

  return true;
}

export function isLoginResponse(r: APIResponse): r is LoginResponse {
  const res: LoginResponse = <LoginResponse>r;
  return isAPIResponseSuccess(res) && typeof res.data.token === 'string';
}

export function isDeployResponse(r: APIResponse): r is DeployResponse {
  const res: DeployResponse = <DeployResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.snapshot === 'string'
    && typeof res.data.channel === 'string';
}

export function isPackageProjectRequestResponse(r: APIResponse): r is PackageProjectRequestResponse {
  const res: PackageProjectRequestResponse = <PackageProjectRequestResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.id === 'number'
    && typeof res.data.presigned_post === 'object'
    && typeof res.data.presigned_post.url === 'string'
    && res.data.presigned_post.fields && typeof res.data.presigned_post.fields === 'object';
}

export function isPackageBuild(o: Object): o is PackageBuild {
  const obj = <PackageBuild>o;
  return obj && typeof obj === 'object'
    && typeof obj.id === 'number'
    && (!obj.name) || typeof obj.name === 'string'
    && typeof obj.created === 'string'
    && (!obj.completed || typeof obj.completed === 'string')
    && typeof obj.platform === 'string'
    && typeof obj.status === 'string'
    && typeof obj.mode === 'string'
    && (!obj.security_profile_tag || typeof obj.security_profile_tag === 'string')
    && (!obj.url || typeof obj.url === 'string');
}

export function isSecurityProfile(o: Object): o is SecurityProfile {
  const obj = <SecurityProfile>o;
  return obj && typeof obj === 'object'
    && typeof obj.name === 'string'
    && typeof obj.tag === 'string'
    && typeof obj.type === 'string'
    && typeof obj.created === 'string'
    && typeof obj.credentials === 'object';
}

export function isSecurityProfileResponse(r: APIResponse): r is SecurityProfileResponse {
  const res: SecurityProfileResponse = <SecurityProfileResponse>r;
  return isAPIResponseSuccess(res) && isSecurityProfile(res.data);
}

export function isSecurityProfilesResponse(r: APIResponse): r is SecurityProfilesResponse {
  const res: SecurityProfilesResponse = <SecurityProfilesResponse>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isSecurityProfile(res.data[0]);
  }

  return true;
}

export function isPackageBuildResponse(r: APIResponse): r is PackageBuildResponse {
  const res: PackageBuildResponse = <PackageBuildResponse>r;
  return isAPIResponseSuccess(res) && isPackageBuild(res.data);
}

export function isPackageBuildsResponse(r: APIResponse): r is PackageBuildsResponse {
  const res: PackageBuildsResponse = <PackageBuildsResponse>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isPackageBuild(res.data[0]);
  }

  return true;
}

export function isDeployChannelResponse(r: APIResponse): r is DeployChannelResponse {
  const res: DeployChannelResponse = <DeployChannelResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.tag === 'string';
}

export function isDeploySnapshotResponse(r: APIResponse): r is DeploySnapshotResponse {
  const res: DeploySnapshotRequestResponse = <DeploySnapshotRequestResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.url === 'string';
}

export function isDeploySnapshotRequestResponse(r: APIResponse): r is DeploySnapshotRequestResponse {
  const res: DeploySnapshotRequestResponse = <DeploySnapshotRequestResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.presigned_post === 'object'
    && typeof res.data.presigned_post.url === 'string'
    && res.data.presigned_post.fields && typeof res.data.presigned_post.fields === 'object';
}
