import * as os from 'os';

import { flattenArray } from './array';

export const ERROR_NETWORK_ADDRESS_NOT_AVAIL = 'NETWORK_ADDRESS_NOT_AVAIL';

export function getAvailableIPAddress() {
  let interfaces = os.networkInterfaces();
  return flattenArray(
    Object.keys(interfaces).map(deviceName => (
      interfaces[deviceName].map(item => ({
        address: item.address,
        deviceName,
        family: item.family,
        internal: item.internal
      }))
    ))
  )
  .filter(item => !item.internal && item.family === 'IPv4');
}

export async function findClosestOpenPort(host: string, port: number): Promise<number> {
  async function t(portToCheck: number): Promise<number> {
    const isTaken = await isPortTaken(host, portToCheck);
    if (!isTaken) {
      return portToCheck;
    }
    return t(portToCheck + 1);
  }

  return t(port);
}

export async function isPortTaken(host: string, port: number): Promise<boolean> {
  const net = await import('net');

  return new Promise<boolean>((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRNOTAVAIL') {
          reject(ERROR_NETWORK_ADDRESS_NOT_AVAIL);
        }
        if (err.code !== 'EADDRINUSE') {
          return resolve(true);
        }
        resolve(true);
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(false);
        })
        .close();
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .listen(port, host);
  });
}
