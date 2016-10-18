import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess
} from '../definitions';

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  return r.meta.status < 400;
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  return r.meta.status >= 400;
}
