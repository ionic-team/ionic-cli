import chalk from 'chalk';

import { IonicEnvironment, ServeOptions } from '../definitions';
import { FatalException } from './errors';

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;

export const IONIC_LAB_URL = '/ionic-lab';

export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

export async function selectExternalIP(env: IonicEnvironment, options: ServeOptions): Promise<[string, string[]]> {
  const { getSuitableNetworkInterfaces } = await import('./utils/network');

  let availableIPs: string[] = [];
  let chosenIP = options.address;

  if (options.address === BIND_ALL_ADDRESS) {
    availableIPs = getSuitableNetworkInterfaces().map(ip => ip.address);

    if (availableIPs.length === 0) {
      if (options.externalAddressRequired) {
        throw new FatalException(
          `No external network interfaces detected. In order to use livereload with run/emulate you will need one.\n` +
          `Are you connected to a local network?\n`
        );
      }
    } else if (availableIPs.length === 1) {
      chosenIP = availableIPs[0];
    } else if (availableIPs.length > 1) {
      if (options.externalAddressRequired) {
        env.log.warn(
          'Multiple network interfaces detected!\n' +
          'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
          `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`
        );

        const promptedIp = await env.prompt({
          type: 'list',
          name: 'promptedIp',
          message: 'Please select which IP to use:',
          choices: availableIPs,
        });

        chosenIP = promptedIp;
      }
    }
  }

  return [ chosenIP, availableIPs ];
}
