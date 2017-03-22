import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  AuthTokenResponse,
  AppDetails,
  AppResponse,
  DeployChannelResponse,
  DeployResponse,
  DeploySnapshotRequestResponse,
  LogLevel,
  LoginResponse,
  SuperAgentError,
} from './definitions';

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'ok', 'warn', 'error'];

export function isLogLevel(l: string): l is LogLevel {
  const loglevel: LogLevel = <LogLevel>l;
  return LOG_LEVELS.includes(loglevel);
}

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err: SuperAgentError = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  let res: APIResponseSuccess = <APIResponseSuccess>r;
  return res && (typeof res.data === 'object' || typeof res.data === 'string');
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  let res: APIResponseError = <APIResponseError>r;
  return res && typeof res.error === 'object';
}

export function isAppDetails(d: any): d is AppDetails {
  let details: AppDetails = <AppDetails>d;
  return details && typeof details === 'object'
    && typeof details.id === 'string'
    && typeof details.name === 'string'
    && typeof details.slug === 'string';
}

export function isAppResponse(r: APIResponse): r is AppResponse {
  let res: AppResponse = <AppResponse>r;
  return isAPIResponseSuccess(res) && isAppDetails(res.data);
}

export function isAuthTokenResponse(r: APIResponse): r is AuthTokenResponse {
  let res: AuthTokenResponse = <AuthTokenResponse>r;
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
  let res: LoginResponse = <LoginResponse>r;
  return isAPIResponseSuccess(res) && typeof res.data.token === 'string';
}

export function isDeployResponse(r: APIResponse): r is DeployResponse {
  let res: DeployResponse = <DeployResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.snapshot === 'string'
    && typeof res.data.channel === 'string';
}

export function isDeployChannelResponse(r: APIResponse): r is DeployChannelResponse {
  let res: DeployChannelResponse = <DeployChannelResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.tag === 'string';
}

export function isDeploySnapshotRequestResponse(r: APIResponse): r is DeploySnapshotRequestResponse {
  let res: DeploySnapshotRequestResponse = <DeploySnapshotRequestResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.presigned_post === 'object'
    && typeof res.data.presigned_post.url === 'string'
    && res.data.presigned_post.fields && typeof res.data.presigned_post.fields === 'object';
}
