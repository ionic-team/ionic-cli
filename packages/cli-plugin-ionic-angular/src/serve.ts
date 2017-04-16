import * as chalk from 'chalk';

import { ServeHookArgs } from '@ionic/cli-utils';

import { load } from './lib/modules';
import { getAvailableIPAddress } from './utils/network';
import { minimistOptionsToArray } from './utils/arguments';

export async function serve(args: ServeHookArgs): Promise<{ [key: string]: any }> {
  const availableIPs = getAvailableIPAddress();
  if (availableIPs.length === 0 && args.options.externalIpRequired) {
    throw new Error(`It appears that you do not have any external network interfaces. ` +
      `In order to use livereload with emulate you will need one.`
    );
  }

  let chosenIP = (availableIPs.length === 0) ? '0.0.0.0' : availableIPs[0].address;

  if (availableIPs.length > 1) {
    if (availableIPs.find(({address}) => address === args.options.address)) {
      chosenIP = args.options.address;
    } else {
      const inquirer = load('inquirer');
      const promptAnswers = await inquirer.prompt({
        type: 'list',
        name: 'ip',
        message: 'Multiple addresses available. Please select which address to use:',
        choices: availableIPs.map(ip => ip.address)
      });
      chosenIP = promptAnswers['ip'];
    }
  }

  let appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  // using app-scripts and livereload is requested
  // Also remove commandName from the rawArgs passed
  console.log(`  Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))}`);
  const settings = await AppScripts.serve(context);

  if (!settings) { // TODO: shouldn't be needed
    throw new Error(`app-scripts serve unexpectedly failed.`);
  }

  return  {
    publicIp: chosenIP,
    protocol: 'http',
    ...settings
  };
}
