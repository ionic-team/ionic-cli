import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';
import { generateAppScriptsArguments } from './utils/arguments';

export default async function build(cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<{ [key: string]: any }> {
  const appScriptsArgs = generateAppScriptsArguments(this.metadata, inputs, options);
  process.argv = appScriptsArgs;

  const appScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  this.env.log.msg(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
  return appScripts.build(context);
}
