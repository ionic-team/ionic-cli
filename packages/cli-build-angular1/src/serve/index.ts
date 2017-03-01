import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';
import { serve } from './serve';
import {
  DEFAULT_ADDRESS,
  DEFAULT_SERVER_PORT,
  DEFAULT_LIVERELOAD_PORT,
  DEFAULT_NOTIFICATION_PORT,
  ServerOptions
} from './serve-config';
import { findClosestOpenPort, getAvailableIPAddress } from '../utils/network';
import { minimistOptionsToArray } from '../utils/arguments';

export default async function(projectDirectory: string, cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<{ [key: string]: any }> {

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
    projectRoot: projectDirectory,
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
  const settings = await serve(serverOptions);

  return  {
    publicIp: chosenIP,
    ...settings
  };
}

function stringToInt(value: string, defaultValue: number): number {
  const result = parseInt(value, 10);
  if (result === NaN) {
    return defaultValue;
  }
  return result;
}
