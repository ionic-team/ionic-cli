import * as path from 'path';

import { ICLIEventEmitter, getCommandInfo, load, readPackageJsonFile } from '@ionic/cli-utils';

import { IonicNamespace } from './commands';

export const namespace = new IonicNamespace();

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('info', async () => {
    const osName = load('os-name');
    const os = osName();
    const node = process.version;

    const packageJson = await readPackageJsonFile(path.resolve(process.env.CLI_BIN_DIR, '..', 'package.json')); // TODO

    const [
      xcode,
      iosDeploy,
      iosSim,
    ] = await Promise.all([
      getCommandInfo('/usr/bin/xcodebuild', ['-version']),
      getCommandInfo('ios-deploy', ['--version']),
      getCommandInfo('ios-sim', ['--version']),
    ]);

    return [
      ['Ionic CLI', packageJson.version],
      ['Node', node],
      ['OS', os],
      ['Xcode', xcode],
      ['ios-deploy', iosDeploy],
      ['ios-sim', iosSim],
    ];
  });
}
