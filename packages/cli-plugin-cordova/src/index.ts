import * as chalk from 'chalk';
import { FatalException, getCommandMetadataList, runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const PLUGIN_NAME = 'cordova';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const cordovaNamespace = new CordovaNamespace();

  // This module does not support v1 projects.
  let projectData = await envInstance.project.load();
  if (!projectData.v2) {
    throw new FatalException(`Ionic CLI v3 only supports Ionic2 projects. If you are currently working on v1 projects\n` +
                            `then you should continue to use Ionic CLI v2 for now. ${chalk.bold('npm install -g ionic@2')}\n`);
  }

  await runCommand({
    namespace: cordovaNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata(): any[] {
  const cordovaNamespace = new CordovaNamespace();
  return getCommandMetadataList(cordovaNamespace);
}
