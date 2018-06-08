import * as os from 'os';
import * as net from 'net';

import * as Debug from 'debug';

import { NetworkInterface } from '../definitions';

const debug = Debug('ionic:cli-framework:utils:network');

export const ERROR_NETWORK_ADDRESS_NOT_AVAIL = 'NETWORK_ADDRESS_NOT_AVAIL';

export function getExternalIPv4Interfaces(): NetworkInterface[] {
  const networkInterfaces = os.networkInterfaces();
  const devices: NetworkInterface[] = [];

  for (const device of Object.keys(networkInterfaces)) {
    const networkInterface = networkInterfaces[device];

    for (const networkAddress of networkInterface) {
      if (!networkAddress.internal && networkAddress.family === 'IPv4') {
        devices.push({ device, ...networkAddress });
      }
    }
  }

  return devices;
}

export async function findClosestOpenPort(port: number, host?: string): Promise<number> {
  async function t(portToCheck: number): Promise<number> {
    if (await isPortAvailable(portToCheck, host)) {
      return portToCheck;
    }

    return t(portToCheck + 1);
  }

  return t(port);
}

export async function isPortAvailable(port: number, host?: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRNOTAVAIL') {
          reject(ERROR_NETWORK_ADDRESS_NOT_AVAIL);
        } else if (err.code === 'EADDRINUSE') {
          resolve(false); // host/port in use
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(true); // found available host/port
        })
        .close();
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .listen(port, host);
  });
}

/**
 * Continuously attempt TCP connections.
 *
 * By default, this function will only ever resolve once a host is connectable.
 * This behavior can be changed with the `timeout` option, which resolves with
 * `false` if the timeout is reached.
 *
 * @param host The host to connect to.
 * @param port The port to connect to.
 * @param options.timeout Optionally define a timeout, in milliseconds.
 */
export async function isHostConnectable(host: string, port: number, { timeout }: { timeout?: number; } = {}): Promise<boolean> {
  const tryConnect = async () => {
    return new Promise<boolean>((resolve, reject) => {
      const sock = net.connect({ port, host });

      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });

      sock.on('error', err => {
        reject(err);
      });
    });
  };

  return new Promise<boolean>(async resolve => {
    let timer: NodeJS.Timer | undefined;
    let resolved = false;

    if (timeout) {
      timer = setTimeout(() => {
        debug('Timeout of %dms reached while waiting for host connectivity', timeout);
        resolve(false);
        resolved = true;
      }, timeout);

      timer.unref();
    }

    while (!resolved) {
      try {
        await tryConnect();

        if (timer) {
          clearTimeout(timer);
        }

        resolve(true);
        resolved = true;
      } catch (e) {
        // try again
      }
    }
  });
}
