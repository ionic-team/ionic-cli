import * as os from 'os';

export const ERROR_NETWORK_ADDRESS_NOT_AVAIL = 'NETWORK_ADDRESS_NOT_AVAIL';

export type NetworkInterface = { deviceName: string; } & os.NetworkInterfaceInfo;

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
