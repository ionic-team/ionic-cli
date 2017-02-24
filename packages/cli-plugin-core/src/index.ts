import * as chalk from 'chalk';
import { FatalException, getCommandMetadataList, runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { CoreNamespace } from './commands';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const coreNamespace = new CoreNamespace();

  // This module does not support v1 projects.
  let projectData = await envInstance.project.load();
  if (!projectData.v2) {
    throw new FatalException(`Ionic CLI v3 only supports Ionic2 projects. If you are currently working on v1 projects\n` +
                            `then you should continue to use Ionic CLI v2 for now. ${chalk.bold('npm install -g ionic@2')}\n`);
  }

  await runCommand({
    namespace: coreNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata(): any[] {
  const coreNamespace = new CoreNamespace();
  return getCommandMetadataList(coreNamespace);
}
