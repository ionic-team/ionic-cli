import * as path from 'path';
import * as chalk from 'chalk';
import { stringToInt } from '../utils/helpers';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';
import { CommandHookArgs, IonicEnvironment, findClosestOpenPort, getAvailableIPAddress } from '@ionic/cli-utils';
import {
  DEFAULT_ADDRESS,
  DEFAULT_LIVERELOAD_PORT,
  DEFAULT_SERVER_PORT,
  IONIC_LAB_URL,
  ServerOptions,
  WATCH_PATTERNS,
} from './config';
import { minimistOptionsToArray } from '../utils/arguments';
import { load } from '../lib/modules';

export async function serve(args: CommandHookArgs): Promise<{ [key: string]: any }> {

  const appScriptsArgs = minimistOptionsToArray(args.options);
  console.log(`  Starting server: ${chalk.bold(appScriptsArgs.join(' '))}`);


  // Find appropriate IP to use for cordova to reference
  const availableIPs = getAvailableIPAddress();
  if (availableIPs.length === 0) {
    throw new Error(`It appears that you do not have any external network interfaces. ` +
      `In order to use livereload with emulate you will need one.`
    );
  }

  let chosenIP = availableIPs[0].address;
  if (availableIPs.length > 1) {
    const inquirer = load('inquirer');
    const promptAnswers = await inquirer.prompt({
      type: 'list',
      name: 'ip',
      message: 'Multiple addresses available. Please select which address to use:',
      choices: availableIPs.map(ip => ip.address)
    });
    chosenIP = promptAnswers['ip'];
  }

  // Setup Options and defaults
  const serverOptions: ServerOptions = {
    projectRoot: args.env.project.directory,
    wwwDir: path.join(args.env.project.directory, 'www'),
    address: <string>args.options['address'] || DEFAULT_ADDRESS,
    port: stringToInt(<string>args.options['port'], DEFAULT_SERVER_PORT),
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
  serverOptions.port = portResults[0];
  serverOptions.livereloadPort = portResults[1];

  // Check if gulp is installed globally for sass
  try {
    await args.env.shell.run('gulp', ['-v'], { showExecution: false });
  } catch (e) {
    serverOptions.gulpInstalled = false;
  }

  // Start up server
  const settings = await setupServer(args.env, serverOptions);

  args.env.log.msg(`dev server running: http://${serverOptions.address}:${serverOptions.port}`);
  return  {
    publicIp: chosenIP,
    ...settings
  };
}

async function setupServer(env: IonicEnvironment, options: ServerOptions): Promise<{ [key: string]: any }> {

  const liveReloadBrowser = createLiveReloadServer(options);
  await createHttpServer(env.project, options);

  const watch = load('glob-watcher');
  const watcher = watch(WATCH_PATTERNS);
  watcher.on('change', async function(filePath: string) {

    switch (path.extname(filePath)) {
    case '.scss':
      if (!options.nosass) {
        await processSassFile(env, options);
      }
      return;
    default:
      env.log.msg(`[${new Date().toTimeString().slice(0, 8)}] ${filePath} changed`);
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

