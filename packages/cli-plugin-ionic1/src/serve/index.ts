import * as path from 'path';
import * as chalk from 'chalk';
import * as watch from 'glob-watcher';
import * as opn from 'opn';
import { stringToInt } from '../utils/helpers';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
  EventEnvironment
} from '@ionic/cli-utils';
import {
  WATCH_PATTERNS,
  IONIC_LAB_URL,
  DEFAULT_ADDRESS,
  DEFAULT_SERVER_PORT,
  DEFAULT_LIVERELOAD_PORT,
  ServerOptions
} from './config';
import { findClosestOpenPort, getAvailableIPAddress } from '../utils/network';
import { minimistOptionsToArray } from '../utils/arguments';

export default async function(env: EventEnvironment, cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<{ [key: string]: any }> {

  const args = minimistOptionsToArray(options);
  console.log(`  Starting server: ${chalk.bold(args.join(' '))}`);


  // Find appropriate IP to use for cordova to reference
  const availableIPs = getAvailableIPAddress();
  if (availableIPs.length === 0) {
    throw new Error(`It appears that you do not have any external network interfaces. ` +
      `In order to use livereload with emulate you will need one.`
    );
  }

  let chosenIP = availableIPs[0].address;
  if (availableIPs.length > 1) {
    const promptAnswers = await env.inquirer.prompt({
      type: 'list',
      name: 'ip',
      message: 'Multiple addresses available. Please select which address to use:',
      choices: availableIPs.map(ip => ip.address)
    });
    chosenIP = promptAnswers['ip'];
  }

  // Setup Options and defaults
  const serverOptions: ServerOptions = {
    projectRoot: env.project.directory,
    wwwDir: path.join(env.project.directory, 'www'),
    address: <string>options['address'] || DEFAULT_ADDRESS,
    port: stringToInt(<string>options['port'], DEFAULT_SERVER_PORT),
    livereloadPort: stringToInt(<string>options['livereload-port'], DEFAULT_LIVERELOAD_PORT),
    browser: <string>options['browser'],
    browseroption: <string>options['browseroption'],
    platform: <string>options['platform'],
    consolelogs: <boolean>options['consolelogs'] || false,
    serverlogs: <boolean>options['serverlogs'] || false,
    nobrowser: <boolean>options['nobrowser'] || false,
    nolivereload: <boolean>options['nolivereload'] || false,
    noproxy: <boolean>options['noproxy'] || false,
    lab: <boolean>options['lab'] || false,
    iscordovaserve: <boolean>options['iscordovaserve'] || false,
    nogulp: <boolean>options['nogulp'] || false,
    nosass: <boolean>options['nosass'] || false,
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
    await env.shell.run('gulp', ['-v']);
  } catch (e) {
    serverOptions.gulpInstalled = false;
  }

  // Start up server
  const settings = await setupServer(env, serverOptions);

  env.log.msg(`dev server running: http://${serverOptions.address}:${serverOptions.port}`);
  return  {
    publicIp: chosenIP,
    ...settings
  };
}

async function setupServer(env: EventEnvironment, options: ServerOptions): Promise<{ [key: string]: any }> {

  const liveReloadBrowser = createLiveReloadServer(options);
  await createHttpServer(env.project, options);

  const watcher = watch(WATCH_PATTERNS);
  watcher.on('change', async function(filePath: string) {

    switch (path.extname(filePath)) {
    case '.scss':
      await processSassFile(env, options);
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

    opn(openOptions.join(''));
  }
  return options;
}

async function processSassFile(env: EventEnvironment, options: ServerOptions): Promise<void> {
  if (!options.gulpInstalled) {
    env.log.error(`You are trying to build a sass file, but unfortunately Ionic1 projects require\n` +
                  `gulp to build these files. In order to continue please execute the following\n` +
                  `command to install gulp.\n\n` +
                  `    ${chalk.green(`npm install -g gulp`)}`);
    return;
  }
   await env.shell.run('gulp', ['sass'], { 'cwd': env.project.directory });
}

