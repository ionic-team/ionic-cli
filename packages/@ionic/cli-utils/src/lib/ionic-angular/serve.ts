import chalk from 'chalk';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';

import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, selectExternalIP } from '../serve';
import { FatalException } from '../errors';
import { importAppScripts } from './app-scripts';

export interface AppScriptsServeOptions extends ServeOptions {
  platform: string;
  target?: string;
  iscordovaserve: boolean;
}

export async function serve({ env, options }: { env: IonicEnvironment, options: AppScriptsServeOptions }): Promise<ServeDetails> {
  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);

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
    externalNetworkInterfaces: availableInterfaces,
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
    nobrowser: !options.open,
    nolivereload: !options.livereload,
    noproxy: !options.proxy,
    lab: options.lab,
    browser: options.browser,
    browseroption: options.browserOption,
    iscordovaserve: options.iscordovaserve,
    platform: options.platform,
    target: options.target,
    env: options.env,
  };

  return minimistOptionsToArray(minimistArgs, { useEquals: false });
}
