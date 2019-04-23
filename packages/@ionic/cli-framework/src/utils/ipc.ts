import { fork } from '@ionic/utils-subprocess';
import { ChildProcess } from 'child_process';
import * as Debug from 'debug';
import * as fs from 'fs';

import { ERROR_IPC_UNKNOWN_PROCEDURE, IPCError } from '../errors';

const debug = Debug('ionic:cli-framework:utils:ipc');

export interface RPCRequest<P extends string, A extends any[]> {
  type: 'rpc-request';
  id: string;
  procedure: P;
  args: A;
}

export interface RPCResponse<R extends RPCRequest<any, any>, D extends object> {
  type: 'rpc-response';
  id: string;
  procedure: R['procedure'];
  request: R;
  err?: any;
  data: D;
}

export type RPC<P extends string, A extends any[], D extends object> = RPCResponse<RPCRequest<P, A>, D>;

export interface RPCProcessOptions {
  readonly name?: string;
  readonly timeout?: number;
}

export class RPCProcess {
  readonly name: string;
  readonly timeout: number;
  protected responseProcedures: Map<string, (args: any[]) => Promise<any>> = new Map();
  protected proc?: ChildProcess;

  constructor({ name = 'unnamed', timeout = 5000 }: RPCProcessOptions = {}) {
    this.name = name;
    this.timeout = timeout;
  }

  start(proc: ChildProcess | NodeJS.Process): void {
    if (this.proc) {
      throw new IPCError('RPC process already started.');
    }

    const p = proc as ChildProcess;

    if (!p.send) {
      throw new IPCError('Cannot use proc: `send()` undefined.');
    }

    this.proc = p;

    p.on('message', async (msg: any) => {
      if (isRPCRequest(msg)) {
        debug('%s: Received RPC request: %O', this.name, msg);
        const fn = this.responseProcedures.get(msg.procedure);
        let err: any;
        let data: any;

        if (fn) {
          try {
            data = await fn(msg.args);
          } catch (e) {
            err = e;
          }
        } else {
          err = new IPCError(`Unknown procedure: ${msg.procedure}`);
          err.code = ERROR_IPC_UNKNOWN_PROCEDURE;
        }

        const response: RPCResponse<any, object> = { type: 'rpc-response', id: msg.id, procedure: msg.procedure, request: msg, err, data };

        if (p.send) {
          p.send(response);
          debug('%s: Sent RPC response: %O', this.name, response);
        } else {
          throw new IPCError('Cannot use proc: `send()` undefined.');
        }
      }
    });

    p.on('error', err => {
      debug('%s: Encountered error with proc: %O', this.name, err);
    });

    debug('%s: RPC process initiated (pid: %d)', this.name, p.pid);
  }

  register<R extends RPCResponse<any, object>>(procedure: R['procedure'], fn: (args: R['request']['args']) => Promise<R['data']>): void {
    this.responseProcedures.set(procedure, fn);
  }

  async call<R extends RPCResponse<any, object>>(procedure: R['procedure'], args: R['request']['args']): Promise<R['data']> {
    const p = this.proc;

    if (!p) {
      throw new IPCError('Cannot call procedure: no proc started.');
    }

    const id = Math.random().toString(16).substring(2, 8);
    const request: RPCRequest<any, any> = { type: 'rpc-request', id, procedure, args };

    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new IPCError(`Timeout of ${this.timeout}ms reached.`));
      }, this.timeout);

      const messageHandler = (msg: any) => {
        if (isRPCResponse(msg) && msg.id === id) {
          debug('%s: Received RPC response: %O', this.name, msg);
          if (msg.err) {
            reject(msg.err);
          } else {
            resolve(msg.data);
          }

          p.removeListener('message', messageHandler);
          p.removeListener('disconnect', disconnectHandler);
          clearTimeout(timer);
        }
      };

      const disconnectHandler = () => {
        reject(new IPCError('Unexpected disconnect. Rejecting call!'));
        clearTimeout(timer);
      };

      p.on('message', messageHandler);
      p.on('disconnect', disconnectHandler);

      if (p.send) {
        p.send(request);
        debug('%s: Sent RPC request: %O', this.name, request);
      } else {
        reject(new IPCError('Cannot use proc: `send()` undefined.'));
        clearTimeout(timer);
      }
    });
  }

  end(): void {
    if (!this.proc) {
      throw new IPCError(`RPC process not started.`);
    }

    this.proc.disconnect();
    debug('%s: Disconnected', this.name);
  }
}

export class RPCHost {
  protected rpc: RPCProcess;

  constructor(readonly modulePath: string, readonly args: readonly string[]) {
    this.rpc = new RPCProcess({ name: 'host' });
  }

  start(): void {
    try {
      fs.accessSync(this.modulePath, fs.constants.R_OK);
    } catch (e) {
      debug('Error during access check: %O', e);
      throw new IPCError(`Module not accessible: ${this.modulePath}`);
    }

    const p = fork(this.modulePath, this.args, { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    debug('RPC subprocess forked %o', [this.modulePath, ...this.args]);

    this.rpc.start(p);
  }

  register<R extends RPCResponse<any, object>>(procedure: R['procedure'], fn: (args: R['request']['args']) => Promise<R['data']>): void {
    this.rpc.register(procedure, fn);
  }

  async call<R extends RPCResponse<any, object>>(procedure: R['procedure'], args: R['request']['args']): Promise<R['data']> {
    return this.rpc.call(procedure, args);
  }

  end(): void {
    this.rpc.end();
  }
}

function isRPCRequest(msg: any): msg is RPCRequest<any, any> {
  return msg && msg.type === 'rpc-request' && typeof msg.procedure === 'string';
}

function isRPCResponse(msg: any): msg is RPCResponse<any, object> {
  return msg && msg.type === 'rpc-response' && typeof msg.procedure === 'string';
}
