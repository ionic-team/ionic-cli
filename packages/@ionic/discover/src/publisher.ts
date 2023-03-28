import * as Debug from 'debug';
import * as dgram from 'dgram';
import * as events from 'events';
import { Netmask } from 'netmask';
import * as os from 'os';

const debug = Debug('ionic:discover:publisher');

const PREFIX = 'ION_DP';
const PORT = 41234;

export interface Interface {
  address: string;
  broadcast: string;
}

export interface PublisherMessage {
  t: number;
  id: string;
  nspace: string;
  name: string;
  host: string;
  ip: string;
  port: number;
  commPort?: number;
  path: string;
}

export interface IPublisherEventEmitter {
  on(event: 'error', listener: (err: Error) => void): this;
}

export class Publisher extends events.EventEmitter implements IPublisherEventEmitter {
  readonly id: string;
  readonly path = '/';

  running = false;
  interfaces?: Interface[];

  protected timer?: NodeJS.Timer;
  protected interval = 2000;
  protected client?: dgram.Socket;

  constructor(
    public namespace: string,
    public name: string,
    public port: number,
    public commPort?: number
  ) {
    super();

    if (name.indexOf(':') >= 0) {
      throw new Error('name should not contain ":"');
    }

    this.id = Math.random().toString(10).substring(2, 8);
  }

  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.running) {
        return resolve();
      }

      this.running = true;

      if (!this.interfaces) {
        this.interfaces = this.getInterfaces();
      }

      const client = this.client = dgram.createSocket('udp4');

      client.on('error', err => {
        this.emit('error', err);
      });

      client.on('listening', () => {
        client.setBroadcast(true);
        this.timer = setInterval(() => this.sayHello(), this.interval);
        this.sayHello();
        debug('Publisher starting');
        resolve();
      });

      client.bind();
    });
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (this.client) {
      this.client.close();
      this.client = undefined;
    }
  }

  protected buildMessage(ip: string): PublisherMessage {
    return {
      t: Date.now(),
      id: this.id,
      nspace: this.namespace,
      name: this.name,
      host: os.hostname(),
      ip,
      port: this.port,
      commPort: this.commPort,
      path: this.path,
    };
  }

  protected getInterfaces(): Interface[] | undefined {
    return prepareInterfaces(os.networkInterfaces());
  }

  protected sayHello() {
    if (!this.interfaces) {
      throw new Error('No network interfaces set--was the service started?');
    }

    if (!this.client) {
      throw new Error('Client not initialized--was the service started?');
    }

    try {
      for (const iface of this.interfaces) {
        const message = this.buildMessage(iface.address);
        const serialized = PREFIX + JSON.stringify(message);
        const buf = Buffer.from(serialized);

        debug(`Broadcasting %O to ${iface.broadcast}`, serialized);

        this.client.send(buf, 0, buf.length, PORT, iface.broadcast, err => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    } catch (e: any) {
      this.emit('error', e);
    }
  }
}

export function prepareInterfaces(interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>): Interface[] | undefined {
  const set = new Set<string>();
  const values = Object.values(interfaces);
  const flatValues = values.reduce((prev, current) => prev?.concat(current ? current : []));
  if (flatValues) {
   return flatValues
    .filter((iface: os.NetworkInterfaceInfo) => iface.family === 'IPv4')
    .map((iface: os.NetworkInterfaceInfo) => {
      return {
        address: iface.address,
        broadcast: computeBroadcastAddress(iface.address, iface.netmask),
      };
    })
    .filter((iface: any) => {
      if (!set.has(iface.broadcast)) {
        set.add(iface.broadcast);

        return true;
      }

      return false;
    });
  }
}

export function newSilentPublisher(namespace: string, name: string, port: number): Publisher {
  name = `${name}@${port}`;
  const service = new Publisher(namespace, name, port);

  service.on('error', () => {
    // do not log
  });

  service.start().catch(() => {
    // do not log
  });

  return service;
}

export function computeBroadcastAddress(address: string, netmask: string): string {
  const ip = address + '/' + netmask;
  const block = new Netmask(ip);

  return block.broadcast;
}
