import * as path from 'path';
import * as chalk from 'chalk';

import {
  CommandHookArgs,
  IonicEnvironment,
  findClosestOpenPort,
  getAvailableIPAddress,
  minimistOptionsToArray,
} from '@ionic/cli-utils';

import { stringToInt } from '../utils/helpers';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';

import {
  DEFAULT_ADDRESS,
  DEFAULT_LIVERELOAD_PORT,
  DEFAULT_SERVER_PORT,
  IONIC_LAB_URL,
  ServerOptions,
  WATCH_PATTERNS,
} from './config';

import { load } from '../lib/modules';

export async function serve(args: CommandHookArgs): Promise<{ [key: string]: any }> {
  let chosenIP = 'localhost';

  if (args.options.externalIpRequired) {
    // Find appropriate IP to use for cordova to reference
    const availableIPs = getAvailableIPAddress();
    if (availableIPs.length === 0) {
      throw new Error(`It appears that you do not have any external network interfaces. ` +
        `In order to use livereload with emulate you will need one.`
      );
    }

    chosenIP = availableIPs[0].address;
    if (availableIPs.length > 1) {
      args.env.log.warn(`${chalk.bold('Multiple network interfaces detected!')}\n` +
                        'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
                        `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`);
      const promptedIp = await args.env.prompt({
        type: 'list',
        name: 'promptedIp',
        message: 'Please select which IP to use:',
        choices: availableIPs.map(ip => ip.address)
      });
      chosenIP = promptedIp;
    }
  }

  const serverArgs = minimistOptionsToArray(args.options);
  args.env.log.info(`Starting server: ${chalk.bold(serverArgs.join(' '))} - Ctrl+C to cancel`);

  const projectConfig = await args.env.project.load();

  // Setup Options and defaults
  const serverOptions: ServerOptions = {
    projectRoot: args.env.project.directory,
    wwwDir: path.join(args.env.project.directory, projectConfig.documentRoot || 'www'),
    address: <string>args.options['address'] || DEFAULT_ADDRESS,
    port: stringToInt(<string>args.options['port'], DEFAULT_SERVER_PORT),
    httpPort: stringToInt(<string>args.options['port'], DEFAULT_SERVER_PORT),
    livereloadPort: stringToInt(<string>args.options['livereload-port'], DEFAULT_LIVERELOAD_PORT),
    browser: <string>args.options['browser'],
    browseroption: <string>args.options['browseroption'],
    platform: <string>args.options['platform'],
    consolelogs: <boolean>args.options['consolelogs'] || false,
    serverlogs: <boolean>args.options['serverlogs'] || false,
    nobrowser: <boolean>args.options['nobrowser'] || false,
    nolivereload: <boolean>args.options['nolivereload'] || false,
    noproxy: <boolean>args.options['noproxy'] || false,
    lab: <boolean>args.options['lab'] || false,
    iscordovaserve: <boolean>args.options['iscordovaserve'] || false,
  };

  // Clean up args based on environment state
  const portResults = await Promise.all([
    findClosestOpenPort(serverOptions.address, serverOptions.port),
    findClosestOpenPort(serverOptions.address, serverOptions.livereloadPort),
  ]);
  serverOptions.port = serverOptions.httpPort = portResults[0];
  serverOptions.livereloadPort = portResults[1];

  // Start up server
  const settings = await setupServer(args.env, serverOptions);

  const localAddress = 'http://localhost:' + serverOptions.port;
  const externalAddress = 'http://' + chosenIP + ':' + serverOptions.port;

  args.env.log.info(
    `Development server running\n` +
    `Local: ${chalk.bold(localAddress)}\n` +
    (localAddress !== externalAddress ? `External: ${chalk.bold(externalAddress)}\n` : '')
  );

  if (!serverOptions.nobrowser || serverOptions.lab) {
    const openOptions: string[] = [localAddress]
      .concat(serverOptions.lab ? [IONIC_LAB_URL] : [])
      .concat(serverOptions.browseroption ? [serverOptions.browseroption] : [])
      .concat(serverOptions.platform ? ['?ionicplatform=', serverOptions.platform] : []);

    const opn = load('opn');
    opn(openOptions.join(''));
  }

  return  {
    publicIp: chosenIP,
    ...settings
  };
}

async function setupServer(env: IonicEnvironment, options: ServerOptions): Promise<{ [key: string]: any }> {
  const liveReloadBrowser = createLiveReloadServer(options);
  await createHttpServer(env.project, options);

  const chokidar = load('chokidar');
  const projectConfig = await env.project.load();

  if (!projectConfig.watchPatterns) {
    projectConfig.watchPatterns = [];
  }

  const watchPatterns = [...new Set([...projectConfig.watchPatterns, ...WATCH_PATTERNS])];
  env.log.debug(`Watch patterns: ${watchPatterns.map(v => chalk.bold(v)).join(', ')}`);
  const watcher = chokidar.watch(watchPatterns, { cwd: env.project.directory });
  env.events.emit('watch:init');

  watcher.on('change', (filePath: string) => {
    env.log.info(`[${new Date().toTimeString().slice(0, 8)}] ${chalk.bold(filePath)} changed`);
    liveReloadBrowser([filePath]);
    env.events.emit('watch:change', filePath);
  });

  watcher.on('error', (err: Error) => {
    env.log.error(err.toString());
  });

  return options;
}
