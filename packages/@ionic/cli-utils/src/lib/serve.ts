import * as path from 'path';

import chalk from 'chalk';
import * as expressType from 'express';
import * as proxyMiddlewareType from 'http-proxy-middleware';

import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

import { IonicEnvironment, NetworkInterface, ProjectFileProxy, ServeOptions } from '../definitions';
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

export interface Ports {
  port: number;
  livereloadPort: number;
  notificationPort: number;
}

export async function findOpenPorts(env: IonicEnvironment, address: string, ports: Ports): Promise<Ports> {
  const { ERROR_NETWORK_ADDRESS_NOT_AVAIL, findClosestOpenPort } = await import('./utils/network');

  try {
    const [ port, livereloadPort, notificationPort ] = await Promise.all([
      findClosestOpenPort(ports.port, '0.0.0.0'),
      findClosestOpenPort(ports.livereloadPort, '0.0.0.0'),
      findClosestOpenPort(ports.notificationPort, '0.0.0.0'),
    ]);

    if (ports.port !== port) {
      env.log.debug(`Port ${chalk.bold(String(ports.port))} taken, using ${chalk.bold(String(port))}.`);
      ports.port = port;
    }

    if (ports.livereloadPort !== livereloadPort) {
      env.log.debug(`Port ${chalk.bold(String(ports.livereloadPort))} taken, using ${chalk.bold(String(livereloadPort))}.`);
      ports.livereloadPort = livereloadPort;
    }

    if (ports.notificationPort !== notificationPort) {
      env.log.debug(`Port ${chalk.bold(String(ports.notificationPort))} taken, using ${chalk.bold(String(notificationPort))}.`);
      ports.notificationPort = notificationPort;
    }

    return { port, livereloadPort, notificationPort };
  } catch (e) {
    if (e !== ERROR_NETWORK_ADDRESS_NOT_AVAIL) {
      throw e;
    }

    throw new FatalException(`${chalk.green(address)} is not available--cannot bind.`);
  }
}

export const DEFAULT_PROXY_CONFIG: proxyMiddlewareType.Config = {
  changeOrigin: true,
  logLevel: 'warn',
  ws: true,
};

export function proxyConfigToMiddlewareConfig(proxy: ProjectFileProxy, additionalConfig?: proxyMiddlewareType.Config): proxyMiddlewareType.Config {
  const config = {
    ...DEFAULT_PROXY_CONFIG,
    pathRewrite: { [proxy.path]: '' },
    target: proxy.proxyUrl,
    ...additionalConfig,
  };

  if (proxy.proxyNoAgent) {
    config.agent = <any>false; // TODO: type issue
  }

  if (proxy.rejectUnauthorized === false) {
    config.secure = false;
  }

  return config;
}

export async function attachProjectProxies(app: expressType.Application, env: IonicEnvironment) {
  const project = await env.project.load();

  if (!project.proxies) {
    return;
  }

  for (let proxy of project.proxies) {
    await attachProjectProxy(app, proxy, { logProvider: () => env.log });
    env.log.info(`Proxy created ${chalk.bold(proxy.path)} => ${chalk.bold(proxy.proxyUrl)}`);
  }
}

export async function attachProjectProxy(app: expressType.Application, proxy: ProjectFileProxy, additionalConfig?: proxyMiddlewareType.Config) {
  await attachProxy(app, proxy.path, proxyConfigToMiddlewareConfig(proxy));
}

export async function attachProxy(app: expressType.Application, p: string, config: proxyMiddlewareType.Config) {
  const proxyMiddleware = await import('http-proxy-middleware');
  app.use(p, proxyMiddleware(p, config));
}

export async function attachLab(app: expressType.Application) {
  const express = await import('express');

  app.use(IONIC_LAB_URL + '/static', express.static(path.join(__dirname, '..', 'assets', 'lab', 'static')));
  app.get(IONIC_LAB_URL, (req, res) => res.sendFile('index.html', { root: path.join(__dirname, '..', 'assets', 'lab') }));
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

export async function getSupportedDevAppPlugins(): Promise<Set<string>> {
  const p = path.resolve(__dirname, '..', 'assets', 'devapp', 'plugins.json');
  const plugins = await fsReadJsonFile(p);

  if (!Array.isArray(plugins)) {
    throw new Error(`Cannot read ${p} file of supported plugins.`);
  }

  // This one is common, and hopefully obvious enough that the devapp doesn't
  // use any splash screen but its own, so we mark it as "supported".
  plugins.push('cordova-plugin-splashscreen');

  return new Set(plugins);
}
