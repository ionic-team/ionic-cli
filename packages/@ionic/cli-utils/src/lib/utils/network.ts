import * as os from 'os';
import * as net from 'net';

import { NetworkInterface } from '../../definitions';

export const ERROR_NETWORK_ADDRESS_NOT_AVAIL = 'NETWORK_ADDRESS_NOT_AVAIL';

export function getSuitableNetworkInterfaces(): NetworkInterface[] {
  const networkInterfaces = os.networkInterfaces();
  const devices: NetworkInterface[] = [];

  for (let deviceName of Object.keys(networkInterfaces)) {
    const networkInterface = networkInterfaces[deviceName];

    for (let networkAddress of networkInterface) {
      if (!networkAddress.internal && networkAddress.family === 'IPv4') {
        devices.push({ deviceName, ...networkAddress });
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
  const net = await import('net');

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

export async function isHostConnectable(host: string, port: number, timeout: number = 1000): Promise<boolean> {
  let ms = 0;
  const interval = 1000;

  const tryConnect = async () => {
    const sock = new net.Socket();

    return new Promise<boolean>((resolve, reject) => {
      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });

      sock.on('error', err => {
        reject(err);
      });

      sock.connect(port, host);
    });
  };

  return new Promise<boolean>(async (resolve) => {
    setInterval(() => {
      ms += interval;

      if (ms > timeout) {
        resolve(false);
      }
    }, interval);

    while (true) {
      try {
        await tryConnect();
        resolve(true);
      } catch (e) {}
    }
  });
}
