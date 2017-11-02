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

export interface DevAppDetails {
  channel?: string;
  port?: number;
  interfaces: {
    address: string;
    broadcast: string;
  }[];
}

export async function gatherDevAppDetails(env: IonicEnvironment, options: ServeOptions): Promise<DevAppDetails | undefined> {
  let devAppActive = !options.iscordovaserve && options.devapp;

  if (devAppActive) {
    const { getSuitableNetworkInterfaces } = await import('./utils/network');
    const { computeBroadcastAddress } = await import('./devapp');

    const availableInterfaces = getSuitableNetworkInterfaces();

    // TODO: Unfortunately, we can't do this yet--there is no
    // accurate/reliable/realistic way to identify a WiFi network uniquely in
    // NodeJS. The best thing we can do is tell the dev what is happening.

    // const config = await env.config.load();

    // const knownInterfaces = new Set(config.devapp.knownInterfaces.map(i => i.mac));
    // const diff = [...new Set(availableInterfaces.filter(i => !knownInterfaces.has(i.mac)))];

    // if (diff.length > 0) {
    //   env.log.warn(
    //     `New network interface(s) detected!\n` +
    //     `You will be prompted to select which network interfaces are trusted for your app to show up in Ionic DevApp. If you're on public WiFi, you may not want to broadcast your app. To trust all networks, just press ${chalk.cyan.bold('<enter>')}.\n\n` +
    //     `Need to install the DevApp? ${emoji('👉 ', '-->')} ${chalk.bold('https://bit.ly/ionic-dev-app')}`
    //   );

    //   const trustedInterfaceMacs = await env.prompt({
    //     type: 'checkbox',
    //     name: 'checkbox',
    //     message: 'Please select trusted interfaces:',
    //     choices: diff.map(i => ({
    //       name: `${chalk.bold(i.address)} ${chalk.dim(`(mac: ${i.mac}, label: ${i.deviceName})`)}`,
    //       value: i.mac,
    //       checked: true,
    //     })),
    //   });

    //   const untrustedInterfaceMacs = diff
    //     .filter(i => !trustedInterfaceMacs.includes(i.mac))
    //     .map(i => i.mac);

    //   const trustedInterfaces = trustedInterfaceMacs.map(mac => ({ trusted: true, mac }));
    //   const untrustedInterfaces = untrustedInterfaceMacs.map(mac => ({ trusted: false, mac }));

    //   config.devapp.knownInterfaces = config.devapp.knownInterfaces.concat(trustedInterfaces);
    //   config.devapp.knownInterfaces = config.devapp.knownInterfaces.concat(untrustedInterfaces);
    // }

    // const trustedInterfaceMacs = config.devapp.knownInterfaces
    //   .filter(i => i.trusted)
    //   .map(i => i.mac);

    // const availableTrustedInterfaces = availableInterfaces.filter(i => trustedInterfaceMacs.includes(i.mac));

    const interfaces = availableInterfaces
      .map(i => ({
        ...i,
        broadcast: computeBroadcastAddress(i.address, i.netmask),
      }));

    return { interfaces };
  }
}

export async function publishDevApp(env: IonicEnvironment, options: ServeOptions, details: DevAppDetails & { port: number; }): Promise<string | undefined> {
  let devAppActive = !options.iscordovaserve && options.devapp;

  if (devAppActive) {
    const { createPublisher } = await import('./devapp');
    const publisher = await createPublisher(env, details.port);
    publisher.interfaces = details.interfaces;

    publisher.on('error', (err: Error) => {
      env.log.debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
    });

    try {
      await publisher.start();
    } catch (e) {
      env.log.error(`Could not publish DevApp service: ${String(e.stack ? e.stack : e)}`);
    }

    return publisher.name;
  }
}
