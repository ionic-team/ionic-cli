import * as path from 'path';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as watch from 'glob-watcher';
import * as opn from 'opn';
import { stringToInt } from '../utils/helpers';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
  IProject
} from '@ionic/cli-utils';
import {
  WATCH_PATTERNS,
  IONIC_LAB_URL,
  DEFAULT_ADDRESS,
  DEFAULT_SERVER_PORT,
  DEFAULT_LIVERELOAD_PORT,
  DEFAULT_NOTIFICATION_PORT,
  ServerOptions
} from './config';
import { findClosestOpenPort, getAvailableIPAddress } from '../utils/network';
import { minimistOptionsToArray } from '../utils/arguments';

export default async function(project: IProject, cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<{ [key: string]: any }> {

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
    projectRoot: project.directory,
    wwwDir: path.join(project.directory, 'www'),
    address: <string>options['address'] || DEFAULT_ADDRESS,
    port: stringToInt(<string>options['port'], DEFAULT_SERVER_PORT),
    livereloadPort: stringToInt(<string>options['livereloadPort'], DEFAULT_LIVERELOAD_PORT),
    notificationPort: stringToInt(<string>options['notificationPort'], DEFAULT_NOTIFICATION_PORT),
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
    nosass: <boolean>options['nosass'] || false
  };


  // Clean up args based on environment state
  serverOptions.address = (serverOptions.address === '0.0.0.0') ? 'localhost' : serverOptions.address;
  const portResults = await Promise.all([
    findClosestOpenPort(serverOptions.address, serverOptions.port),
    findClosestOpenPort(serverOptions.address, serverOptions.livereloadPort),
    findClosestOpenPort(serverOptions.address, serverOptions.notificationPort)
  ]);
  serverOptions.port = portResults[0];
  serverOptions.livereloadPort = portResults[1];
  serverOptions.notificationPort = portResults[2];

  // Start up server
  const settings = await setupServer(project, serverOptions);

  console.log(`dev server running: http://${serverOptions.address}:${serverOptions.port}`);
  return  {
    publicIp: chosenIP,
    ...settings
  };
}

async function setupServer(project: IProject, options: ServerOptions): Promise<{ [key: string]: any }> {

  const fileChangedFn = createLiveReloadServer(options);
  await createHttpServer(project, options);

  const watcher = watch(WATCH_PATTERNS);
  watcher.on('change', function(path: string) {

    fileChangedFn([path]);
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
