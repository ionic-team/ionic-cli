import * as path from 'path';

import chalk from 'chalk';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { IProject, IonicEnvironment } from '../../definitions';

export async function getIonicAngularVersion(env: IonicEnvironment, project: IProject): Promise<string | undefined> {
  const { readPackageJsonFile } = await import('@ionic/cli-framework/utils/npm');
  const ionicAngularPackageJsonFilePath = path.resolve(project.directory, 'node_modules', 'ionic-angular', 'package.json'); // TODO

  try {
    const ionicAngularPackageJson = await readPackageJsonFile(ionicAngularPackageJsonFilePath);
    return ionicAngularPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(ionicAngularPackageJsonFilePath))} file: ${e}`);
  }
}
