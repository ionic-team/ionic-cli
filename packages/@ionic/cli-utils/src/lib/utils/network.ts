import * as os from 'os';

import { flattenArray } from './array';

export const ERROR_NETWORK_ADDRESS_NOT_AVAIL = 'NETWORK_ADDRESS_NOT_AVAIL';

export function getAvailableIPAddresses() {
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
