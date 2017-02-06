import { FatalException, getCommandMetadataList, createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { CoreNamespace } from './commands';
import * as chalk from 'chalk';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const coreNamespace = new CoreNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, coreNamespace);

  // This module does not support v1 projects.
  let projectData = await commandEnvironment.project.load();
  if (!projectData.v2) {
    throw new FatalException(`Ionic CLI v3 only supports Ionic2 projects. If you are currently working on v1 projects\n` +
                            `then you should continue to use Ionic CLI v2 for now. ${chalk.bold('npm install -g ionic@2')}\n`);
  }

  await runCommand(commandEnvironment);
}

export function getAllCommandMetadata(): any[] {
  const coreNamespace = new CoreNamespace();
  return getCommandMetadataList(coreNamespace);
}
