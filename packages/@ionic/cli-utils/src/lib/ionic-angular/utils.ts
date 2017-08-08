import * as path from 'path';

import * as chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

export async function getIonicAngularVersion(env: IonicEnvironment): Promise<string | undefined> {
  const { readPackageJsonFile } = await import('../utils/npm');
  const { prettyPath } = await import('../utils/format');

  const ionicAngularPackageJsonFilePath = path.resolve(env.project.directory, 'node_modules', 'ionic-angular', 'package.json'); // TODO

  try {
    const ionicAngularPackageJson = await readPackageJsonFile(ionicAngularPackageJsonFilePath);
    return ionicAngularPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(ionicAngularPackageJsonFilePath))} file: ${e}`);
  }
}

export async function getAppScriptsVersion(env: IonicEnvironment): Promise<string | undefined> {
  const { readPackageJsonFile } = await import('../utils/npm');
  const { prettyPath } = await import('../utils/format');

  const appScriptsPackageJsonFilePath = path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts', 'package.json'); // TODO

  try {
    const appScriptsPackageJson = await readPackageJsonFile(appScriptsPackageJsonFilePath);
    return appScriptsPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(appScriptsPackageJsonFilePath))} file: ${e}`);
  }
}

export async function importAppScripts(env: IonicEnvironment): Promise<any> {
  const appScriptsPath = path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts'); // TODO

  return require(appScriptsPath);
}
