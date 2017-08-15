import * as chalk from 'chalk';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';

import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES } from '../serve';
import { FatalException } from '../errors';
import { importAppScripts } from './utils';

export async function serve({ env, options }: { env: IonicEnvironment, options: ServeOptions }): Promise<ServeDetails> {
  const { getAvailableIPAddresses } = await import('../utils/network');

  let externalIP = options.address;

  if (options.address === BIND_ALL_ADDRESS) {
    const availableIPs = getAvailableIPAddresses();
    if (availableIPs.length === 0) {
      throw new Error(`It appears that you do not have any external network interfaces. ` +
        `In order to use livereload with emulate you will need one.`
      );
    }

    externalIP = availableIPs[0].address;

    if (options.externalAddressRequired && availableIPs.length > 1) {
      if (availableIPs.find(({ address }) => address === options.address)) {
        externalIP = options.address;
      } else {
        env.log.warn(
          'Multiple network interfaces detected!\n' +
          'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
          `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`
        );

        const promptedIp = await env.prompt({
          type: 'list',
          name: 'promptedIp',
          message: 'Please select which IP to use:',
          choices: availableIPs.map(ip => ip.address)
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
    port: settings.httpPort,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

export async function serveOptionsToAppScriptsArgs(options: ServeOptions) {
  const { minimistOptionsToArray } = await import('../utils/command');

  const minimistArgs = {
    _: [],
    address: options.address,
    port: String(options.port),
    livereloadPort: String(options.livereloadPort),
    consolelogs: options.consolelogs,
    serverlogs: options.serverlogs,
    nobrowser: options.nobrowser,
    nolivereload: options.nolivereload,
    noproxy: options.noproxy,
    lab: options.lab,
    browser: options.browser,
    browseroption: options.browseroption,
    platform: options.platform,
    iscordovaserve: options.iscordovaserve,
  };

  return minimistOptionsToArray(minimistArgs, { useEquals: false });
}
