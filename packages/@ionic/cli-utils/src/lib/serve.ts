import chalk from 'chalk';

import { IonicEnvironment, NetworkInterface, ServeOptions } from '../definitions';
import { FatalException } from './errors';

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;

export const IONIC_LAB_URL = '/ionic-lab';

export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

export async function selectExternalIP(env: IonicEnvironment, options: ServeOptions): Promise<[string, NetworkInterface[]]> {
  const { getSuitableNetworkInterfaces } = await import('./utils/network');

  let availableInterfaces: NetworkInterface[] = [];
  let chosenIP = options.address;

  if (options.address === BIND_ALL_ADDRESS) {
    availableInterfaces = getSuitableNetworkInterfaces();

    if (availableInterfaces.length === 0) {
      if (options.externalAddressRequired) {
        throw new FatalException(
          `No external network interfaces detected. In order to use livereload with run/emulate you will need one.\n` +
          `Are you connected to a local network?\n`
        );
      }
    } else if (availableInterfaces.length === 1) {
      chosenIP = availableInterfaces[0].address;
    } else if (availableInterfaces.length > 1) {
      if (options.externalAddressRequired) {
        env.log.warn(
          'Multiple network interfaces detected!\n' +
          'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n\n' +
          `You may also use the ${chalk.green('--address')} option to skip this prompt.`
        );

        const promptedIp = await env.prompt({
          type: 'list',
          name: 'promptedIp',
          message: 'Please select which IP to use:',
          choices: availableInterfaces.map(i => ({
            name: `${i.address} ${chalk.dim(`(${i.deviceName})`)}`,
            value: i.address,
          })),
        });

        chosenIP = promptedIp;
      }
    }
  }

  return [ chosenIP, availableInterfaces ];
}
