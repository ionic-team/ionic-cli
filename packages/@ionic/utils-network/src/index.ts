import * as Debug from 'debug';
import * as net from 'net';
import * as os from 'os';

const debug = Debug('ionic:utils-network');

export const DEFAULT_ADDRESSES: ReadonlyArray<string> = getDefaultAddresses();

export type NetworkInterface = { device: string; } & os.NetworkInterfaceInfo;

function getDefaultAddresses(): string[] {
  const addresses: string[] = ['0.0.0.0'];

  try {
    const networkInterfaces = os.networkInterfaces();

    for (const device of Object.keys(networkInterfaces)) {
      const networkInterface = networkInterfaces[device];

      addresses.push(...networkInterface.map(i => i.address));
    }
  } catch (e) {
    // swallow
  }

  return addresses;
}

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

/**
 * Attempts to locate a port number starting from `port` and incrementing by 1.
 *
 * This function looks through all internal network interfaces, attempting
 * host/port combinations until it finds an available port on all interfaces.
 *
 * @param port The port at which to start checking.
 */
export async function findClosestOpenPort(port: number): Promise<number> {
  async function t(portToCheck: number): Promise<number> {
    if (await isPortAvailable(portToCheck)) {
      return portToCheck;
    }

    return t(portToCheck + 1);
  }

  return t(port);
}

/**
 * Checks whether a port is open or closed.
 *
 * This function looks through all internal network interfaces, checking
 * whether all host/port combinations are open. If one or more is not, the port
 * is not available.
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  let available = true;

  for (const address of DEFAULT_ADDRESSES) {
    try {
      debug('checking for open port on %s:%d', address, port);
      available = await isPortAvailableForHost(address, port);

      if (!available) {
        return false;
      }
    } catch (e) {
      debug('error while checking %s:%d: %o', address, port, e);
    }
  }

  return available;
}

export function isPortAvailableForHost(host: string, port: number): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
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
      if (host === '0.0.0.0') {
        host = '127.0.0.1';
      }

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
