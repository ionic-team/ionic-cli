import * as path from 'path';

import * as chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

import { fsReadJsonFile } from '../utils/fs';

export async function getIonic1Version(env: IonicEnvironment): Promise<string | undefined> {
  const ionicVersionFilePath = path.resolve(env.project.directory, 'www', 'lib', 'ionic', 'version.json'); // TODO

  try {
    const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
    return ionicVersionJson['version'];
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(ionicVersionFilePath)} file: ${e}`);
  }
}
