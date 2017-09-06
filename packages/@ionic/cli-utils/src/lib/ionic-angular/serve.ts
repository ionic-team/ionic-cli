import * as chalk from 'chalk';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';

import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES } from '../serve';
import { FatalException } from '../errors';
import { importAppScripts } from './utils';

export interface AppScriptsServeOptions extends ServeOptions {
  platform: string;
  target?: string;
  iscordovaserve: boolean;
}

export async function serve({ env, options }: { env: IonicEnvironment, options: AppScriptsServeOptions }): Promise<ServeDetails> {
  const { getAvailableIPAddresses } = await import('../utils/network');

  let availableIPs: string[] = [];
  let externalIP = options.address;

  if (options.address === BIND_ALL_ADDRESS) {
    availableIPs = getAvailableIPAddresses().map(ip => ip.address);

    if (availableIPs.length === 0) {
      if (options.externalAddressRequired) {
        throw new FatalException(
          `No external network interfaces detected. In order to use livereload with run/emulate you will need one.\n` +
          `Are you connected to a local network?\n`
        );
      }
    } else if (availableIPs.length === 1) {
      externalIP = availableIPs[0];
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

        externalIP = promptedIp;
      }
    }
  }

  const appScriptsArgs = await serveOptionsToAppScriptsArgs(options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = await importAppScripts(env);
  const context = AppScripts.generateContext();

  // using app-scripts and livereload is requested
  // Also remove commandName from the rawArgs passed
  env.log.info(`Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))} - Ctrl+C to cancel`);
  const settings = await AppScripts.serve(context);

  if (!settings) { // TODO: shouldn've been fixed after app-scripts 1.3.7
    throw new FatalException(
      `app-scripts serve unexpectedly failed.` +
      `settings: ${settings}` +
      `context: ${context}`
    );
  }

  return  {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalAddresses: availableIPs,
    port: settings.httpPort,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

export async function serveOptionsToAppScriptsArgs(options: AppScriptsServeOptions) {
  const { minimistOptionsToArray } = await import('../utils/command');

  const minimistArgs = {
    _: [],
    address: options.address,
    port: String(options.port),
    livereloadPort: String(options.livereloadPort),
    devLoggerPort: String(options.notificationPort),
    consolelogs: options.consolelogs,
    serverlogs: options.serverlogs,
    nobrowser: !options.browser,
    nolivereload: !options.livereload,
    noproxy: !options.proxy,
    lab: options.lab,
    browser: options.browserName,
    browseroption: options.browserOption,
    iscordovaserve: options.iscordovaserve,
    platform: options.platform,
    target: options.target,
  };

  return minimistOptionsToArray(minimistArgs, { useEquals: false });
}
