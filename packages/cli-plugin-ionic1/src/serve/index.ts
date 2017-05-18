import * as path from 'path';
import * as chalk from 'chalk';
import { stringToInt } from '../utils/helpers';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';
import { CommandHookArgs, IonicEnvironment, findClosestOpenPort, getAvailableIPAddress, minimistOptionsToArray } from '@ionic/cli-utils';
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
  args.env.log.info(`Starting server: ${chalk.bold(serverArgs.join(' '))} - Ctrl+C to cancel\n`);

  const projectConfig = await args.env.project.load();

  // Setup Options and defaults
  const serverOptions: ServerOptions = {
    projectRoot: args.env.project.directory,
    wwwDir: path.join(args.env.project.directory, <string>args.options['documentRoot'] || projectConfig.documentRoot || 'www'),
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
    nogulp: <boolean>args.options['nogulp'] || false,
    nosass: <boolean>args.options['nosass'] || false,
    gulpInstalled: true
  };

  // Clean up args based on environment state
  serverOptions.address = (serverOptions.address === '0.0.0.0') ? 'localhost' : serverOptions.address;
  const portResults = await Promise.all([
    findClosestOpenPort(serverOptions.address, serverOptions.port),
    findClosestOpenPort(serverOptions.address, serverOptions.livereloadPort),
  ]);
  serverOptions.port = serverOptions.httpPort = portResults[0];
  serverOptions.livereloadPort = portResults[1];

  // Check if gulp is installed globally for sass
  try {
    await args.env.shell.run('gulp', ['-v'], { showCommand: false });
  } catch (e) {
    serverOptions.gulpInstalled = false;
  }

  // Start up server
  const settings = await setupServer(args.env, serverOptions);

  args.env.log.info(`dev server running: http://${serverOptions.address}:${serverOptions.port}`);
  return  {
    publicIp: chosenIP,
    ...settings
  };
}

async function setupServer(env: IonicEnvironment, options: ServerOptions): Promise<{ [key: string]: any }> {

  const liveReloadBrowser = createLiveReloadServer(options);
  await createHttpServer(env.project, options);

  const watch = load('glob-watcher');
  const projectConfig = await env.project.load();
  const watcher = watch(projectConfig.watchPatterns || WATCH_PATTERNS);
  watcher.on('change', async function(filePath: string) {

    switch (path.extname(filePath)) {
    case '.scss':
      if (!options.nosass) {
        await processSassFile(env, options);
      }
      return;
    default:
      env.log.info(`[${new Date().toTimeString().slice(0, 8)}] ${filePath} changed`);
      liveReloadBrowser([filePath]);
    }
  });

  if (!options.nobrowser || options.lab) {
    const openOptions: string[] = [`http://${options.address}:${options.port}`]
      .concat(options.lab ? [IONIC_LAB_URL] : [])
      .concat(options.browseroption ? [options.browseroption] : [])
      .concat(options.platform ? ['?ionicplatform=', options.platform] : []);

    const opn = load('opn');
    opn(openOptions.join(''));
  }
  return options;
}

async function processSassFile(env: IonicEnvironment, options: ServerOptions): Promise<void> {
  if (options.nogulp) {
    return;
  }

  if (!options.gulpInstalled) {
    env.log.error(`You are trying to build a sass file, but unfortunately Ionic1 projects require\n` +
                  `gulp to build these files. In order to continue please execute the following\n` +
                  `command to install gulp.\n\n` +
                  `    ${chalk.green(`npm install -g gulp`)}`);
    return;
  }

  await env.shell.run('gulp', ['sass'], { 'cwd': env.project.directory });
}

