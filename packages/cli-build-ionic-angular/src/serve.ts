import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';
import { getAvailableIPAddress } from './utils/network';
import { minimistOptionsToArray } from './utils/arguments';

export default async function(cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<{ [key: string]: any }> {

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

  const appScriptsArgs = minimistOptionsToArray(options, ' ');
  process.argv = appScriptsArgs;

  const appScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  // using app-scripts and livereload is requested
  // Also remove commandName from the rawArgs passed
  console.log(`  Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))}`);
  const settings = await appScripts.serve(context);
  return  {
    publicIp: chosenIP,
    ...settings
  };
}
