import * as chalk from 'chalk';

import { CommandHookArgs, getAvailableIPAddress } from '@ionic/cli-utils';

import { load } from './lib/modules';
import { minimistOptionsToArray } from './utils/arguments';

export async function serve(args: CommandHookArgs): Promise<{ [key: string]: any }> {
  let chosenIP = 'localhost';

  if (args.options.externalIpRequired) {
    const availableIPs = getAvailableIPAddress();
    if (availableIPs.length === 0) {
      throw new Error(`It appears that you do not have any external network interfaces. ` +
        `In order to use livereload with emulate you will need one.`
      );
    }

    chosenIP = (availableIPs.length === 0) ? '0.0.0.0' : availableIPs[0].address;

    if (availableIPs.length > 1) {
      if (availableIPs.find(({ address }) => address === args.options.address)) {
        chosenIP = <string>args.options.address;
      } else {
        args.env.log.warn(`${chalk.bold('Multiple network interfaces detected!')}\n` +
                          'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
                          `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`);
        const promptAnswers = await args.env.prompt({
          type: 'list',
          name: 'ip',
          message: 'Please select which IP to use:',
          choices: availableIPs.map(ip => ip.address)
        });
        chosenIP = promptAnswers['ip'];
      }
    }
  }

  let appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  // using app-scripts and livereload is requested
  // Also remove commandName from the rawArgs passed
  args.env.log.info(`Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))} - Ctrl+C to cancel\n`);
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
