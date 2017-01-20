import { LogLevel, SuperAgentError } from './definitions';

export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'ok', 'warn', 'error'];

export function isLogLevel(l: string): l is LogLevel {
  const loglevel: LogLevel = <LogLevel>l;
  return LOG_LEVELS.includes(loglevel);
}

export function isSuperAgentError(e: Error): e is SuperAgentError {
  const err: SuperAgentError = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}
