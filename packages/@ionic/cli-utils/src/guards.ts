import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  AppDetails,
  CommandPreRun,
  CordovaPackageJson,
  ExitCodeException,
  ICommand,
  LoadedPlugin,
  LogLevel,
  Plugin,
  Response,
  SSHKey,
  SecurityProfile,
  StarterManifest,
  SuperAgentError,
} from './definitions';

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'msg', 'ok', 'warn', 'error', 'announce'];

export function isCommand(cmd: any): cmd is ICommand {
  return cmd && typeof cmd.run === 'function';
}

export function isCommandPreRun(cmd: any): cmd is CommandPreRun {
  return cmd && typeof cmd.preRun === 'function';
}

export function isLogLevel(l: string): l is LogLevel {
  const loglevel = <LogLevel>l;
  return LOG_LEVELS.includes(loglevel);
}

export function isStarterManifest(o: Object): o is StarterManifest {
  const obj = <StarterManifest>o;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.baseref === 'string';
}

export function isCordovaPackageJson(o: Object): o is CordovaPackageJson {
  const obj = <CordovaPackageJson>o;
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.cordova === 'object' &&
    typeof obj.cordova.platforms === 'object' &&
    typeof obj.cordova.plugins === 'object';
}

export function isExitCodeException(e: Error): e is ExitCodeException {
  const err = <any>e;
  return err && typeof err.exitCode === 'number' && err.exitCode >= 0 && err.exitCode <= 255;
}

export function isPlugin(p: any): p is Plugin {
  return p && (typeof p.registerHooks === 'undefined' || typeof p.registerHooks === 'function');
}

export function isLoadedPlugin(p: any): p is LoadedPlugin {
  return p
    && typeof p.meta === 'object'
    && typeof p.fileName === 'string'
    && typeof p.pkg === 'object';
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

export function isAppDetails(d: Object): d is AppDetails {
  const details = <AppDetails>d;
  return details
    && typeof details === 'object'
    && typeof details.id === 'string'
    && typeof details.name === 'string'
    && typeof details.slug === 'string';
}

export function isAppResponse(r: APIResponse): r is Response<AppDetails> {
  const res = <Response<AppDetails>>r;
  return isAPIResponseSuccess(res) && isAppDetails(res.data);
}

export function isAppsResponse(r: APIResponse): r is Response<AppDetails[]> {
  const res = <Response<AppDetails[]>>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isAppDetails(res.data[0]);
  }

  return true;
}

export function isLoginResponse(r: APIResponse): r is Response<{ user: { id: number; email: string; }; token: string; }> {
  const res = <any>r;
  return isAPIResponseSuccess(r)
    && typeof res.data.user === 'object'
    && typeof res.data.user.id === 'number'
    && typeof res.data.user.email === 'string'
    && typeof res.data.token === 'string';
}

export function isUserResponse(r: APIResponse): r is Response<{ id: number; email: string; }> {
  const res = <any>r;
  return isAPIResponseSuccess(r)
    && typeof res.data.id === 'number'
    && typeof res.data.email === 'string';
}

export function isSSHKeyListResponse(r: APIResponse): r is Response<SSHKey[]> {
  const res = <any>r;
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (typeof r.data[0] === 'object') {
    return typeof res.data[0].id === 'string'
      && typeof res.data[0].pubkey === 'string'
      && typeof res.data[0].fingerprint === 'string'
      && typeof res.data[0].annotation === 'string'
      && typeof res.data[0].name === 'string'
      && typeof res.data[0].created === 'string'
      && typeof res.data[0].updated === 'string';
  }

  return true;
}

export function isSSHKeyResponse(r: APIResponse): r is Response<SSHKey> {
  const res = <any>r;
  return isAPIResponseSuccess(r)
    && typeof res.data.id === 'string'
    && typeof res.data.pubkey === 'string'
    && typeof res.data.fingerprint === 'string'
    && typeof res.data.annotation === 'string'
    && typeof res.data.name === 'string'
    && typeof res.data.created === 'string'
    && typeof res.data.updated === 'string';
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

export function isSecurityProfileResponse(r: APIResponse): r is Response<SecurityProfile> {
  const res = <Response<SecurityProfile>>r;
  return isAPIResponseSuccess(res) && isSecurityProfile(res.data);
}

export function isSecurityProfilesResponse(r: APIResponse): r is Response<SecurityProfile[]> {
  const res = <Response<SecurityProfile[]>>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isSecurityProfile(res.data[0]);
  }

  return true;
}
