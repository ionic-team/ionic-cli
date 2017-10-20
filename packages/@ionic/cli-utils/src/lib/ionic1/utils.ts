import * as path from 'path';

import chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

export async function getIonic1Version(env: IonicEnvironment): Promise<string | undefined> {
  const { prettyPath } = await import('../utils/format');

  const ionicVersionFilePath = path.resolve(env.project.directory, 'www', 'lib', 'ionic', 'version.json'); // TODO
  const bowerJsonPath = path.resolve(env.project.directory, 'bower.json');

  try {
    try {
      const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
      return ionicVersionJson['version'];
    } catch (e) {
      env.log.warn(`Error with ${chalk.bold(prettyPath(ionicVersionFilePath))} file: ${e}, trying ${chalk.bold(prettyPath(bowerJsonPath))}.`);

      const bowerJson = await env.project.loadBowerJson();
      let ionicEntry = bowerJson.dependencies && typeof bowerJson.dependencies['ionic'] === 'string' ? bowerJson.dependencies['ionic'] : undefined;

      if (!ionicEntry) {
        ionicEntry = bowerJson.devDependencies && typeof bowerJson.devDependencies['ionic'] === 'string' ? bowerJson.devDependencies['ionic'] : undefined;
      }

      if (!ionicEntry) {
        return;
      }

      const m = ionicEntry.match(/.+#(.+)/);

      if (m && m[1]) {
        return m[1];
      }
    }
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(bowerJsonPath))} file: ${e}`);
  }
}
