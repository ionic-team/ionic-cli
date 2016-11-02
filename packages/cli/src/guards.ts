import { SuperAgentError } from './definitions';

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err: SuperAgentError = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}
