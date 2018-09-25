import * as Debug from 'debug';

import { ServeDetails } from '../definitions';

const debug = Debug('ionic:lib:events');

export interface IPCEvent<E extends string, D extends object> {
  type: 'event';
  event: E;
  data: D;
}

export function emit(event: 'serve:ready', data: ServeDetails): boolean;
export function emit<E extends string, D extends object>(event: E, data: D): boolean {
  if (!process.send) {
    debug('No process.send, not emitting event %s', event);
    return false;
  }

  const msg: IPCEvent<E, D> = { type: 'event', event, data };

  process.send(msg);
  debug('Sent event %s as IPC message to parent process', event);

  return true;
}
