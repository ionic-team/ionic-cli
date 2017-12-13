import * as path from 'path';

import chalk from 'chalk';

import { IProject, IonicEnvironment } from '../../definitions';

export async function getIonicAngularVersion(env: IonicEnvironment, project: IProject): Promise<string | undefined> {
  const { readPackageJsonFile } = await import('@ionic/cli-framework/utils/npm');
  const { prettyPath } = await import('../utils/format');

  const ionicAngularPackageJsonFilePath = path.resolve(project.directory, 'node_modules', 'ionic-angular', 'package.json'); // TODO

  try {
    const ionicAngularPackageJson = await readPackageJsonFile(ionicAngularPackageJsonFilePath);
    return ionicAngularPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(ionicAngularPackageJsonFilePath))} file: ${e}`);
  }
}

export async function getAppScriptsVersion(env: IonicEnvironment, project: IProject): Promise<string | undefined> {
  const { readPackageJsonFile } = await import('@ionic/cli-framework/utils/npm');
  const { prettyPath } = await import('../utils/format');

  const appScriptsPackageJsonFilePath = path.resolve(project.directory, 'node_modules', '@ionic', 'app-scripts', 'package.json'); // TODO

  try {
    const appScriptsPackageJson = await readPackageJsonFile(appScriptsPackageJsonFilePath);
    return appScriptsPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(appScriptsPackageJsonFilePath))} file: ${e}`);
  }
}
