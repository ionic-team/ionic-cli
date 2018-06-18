import * as Debug from 'debug';

const debug = Debug('ionic:cli-utils:lib:events');

export interface IPCEvent<E extends string, D extends object> {
  event: E;
  data: D;
}

export interface ServeReadyIPCEventData {
  port: number;
}

export function emit(event: 'serve:ready', data: ServeReadyIPCEventData): boolean;
export function emit<E extends string, D extends object>(event: E, data: D): boolean {
  if (!process.send) {
    debug('No process.send, not emitting event %s', event);
    return false;
  }

  const msg: IPCEvent<E, D> = { event, data };

  process.send(msg);
  debug('Sent event %s as IPC message to parent process', event);

  return true;
}
