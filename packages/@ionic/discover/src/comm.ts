import * as Debug from 'debug';
import * as events from 'events';
import * as util from 'util';
import * as WebSocket from 'ws';

const debug = Debug('ionic:discover:comm');

const PREFIX = 'ION_CS';

export interface CommServerConnectionPayload {
  event: 'connect';
  email: string;
  username: string;
}

type Payload = CommServerConnectionPayload;

export interface ICommServerEventEmitter {
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'connect', listener: (data: CommServerConnectionPayload) => void): this;
}

export class CommServer extends events.EventEmitter implements ICommServerEventEmitter {
  protected server?: WebSocket.Server;

  constructor(
    public namespace: string,

    /**
     * Unique identifier of the publisher.
     */
    public id: string,

    /**
     * Port of communication server.
     */
    public port: number
  ) {
    super();
  }

  get clients(): Set<WebSocket> {
    return this.server ? this.server.clients : new Set();
  }

  start(): Promise<void> {
    if (this.server) {
      throw new Error('server already initialized');
    }

    const server = this.server = new WebSocket.Server({ clientTracking: true, host: '0.0.0.0', port: this.port });

    return new Promise<void>((resolve, reject) => {
      server.on('error', err => {
        this.emit('error', err);
      });

      server.on('connection', ws => {
        debug(`Connection established. ${server.clients.size} clients.`);

        ws.on('message', data => {
          debug(`Received %O`, data.toString());

          const message = this.parseData(data);

          if (message) {
            this.emit(message.event, message);
          }
        });

        ws.on('close', () => {
          debug(`Connection closed. ${server.clients.size} clients.`);
        });
      });

      server.on('listening', () => {
        debug('Comm server listening: %O', { host: server.options.host, port: this.port });
        resolve();
      });
    });
  }

  private parseData(data: WebSocket.Data): Payload | undefined {
    try {
      const msg = data.toString();
      const msgprefix = msg.substring(0, PREFIX.length);

      if (msgprefix !== PREFIX) {
        throw new Error(`Invalid prefix for message: ${msgprefix}`);
      }

      const payload = JSON.parse(msg.substring(PREFIX.length));

      if (!isPayload(payload)) {
        throw new Error(`Invalid payload: ${util.inspect(payload)}`);
      }

      return payload;
    } catch (e) {
      debug(e);
    }
  }

  stop(): Promise<void> {
    if (!this.server) {
      throw new Error('server not initialized');
    }

    const server = this.server;

    return new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  }
}

function isPayload(payload: any): payload is Payload {
  return payload && typeof payload.event === 'string';
}
