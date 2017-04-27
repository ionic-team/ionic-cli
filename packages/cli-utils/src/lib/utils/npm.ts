import { BowerJson, IShell, IShellRunOptions, PackageJson } from '../../definitions';
import { isBowerJson, isPackageJson } from '../../guards';
import { fsReadJsonFile } from './fs';
import { runcmd } from './shell';

export const ERROR_INVALID_PACKAGE_JSON = 'INVALID_PACKAGE_JSON';
export const ERROR_INVALID_BOWER_JSON = 'INVALID_BOWER_JSON';

let installer: undefined | 'npm' | 'yarn';

export async function readPackageJsonFile(path: string): Promise<PackageJson> {
  const packageJson = await fsReadJsonFile(path);

  if (!isPackageJson(packageJson)) {
    throw ERROR_INVALID_PACKAGE_JSON;
  }

  return packageJson;
}

export async function readBowerJsonFile(path: string): Promise<BowerJson> {
  const bowerJson = await fsReadJsonFile(path);

  if (!isBowerJson(bowerJson)) {
    throw ERROR_INVALID_BOWER_JSON;
  }

  return bowerJson;
}

export async function pkgInstall(shell: IShell, pkg?: string, options?: IShellRunOptions) {
  if (!options) {
    options = {};
  }

  if (!installer) {
    try {
      await runcmd('yarn', ['--version']);
      installer = 'yarn';
    } catch (e) {
      installer = 'npm';
    }
  }

  let installerArgs = [];

  // TODO: handle --save, --save-peer, etc

  if (installer === 'npm') {
    if (pkg) {
      installerArgs = ['install', '--save-dev', pkg];
    } else {
      installerArgs = ['install'];
    }
  } else {
    if (pkg) {
      installerArgs = ['add', '--dev', '--non-interactive', pkg];
    } else {
      installerArgs = ['install', '--non-interactive'];
    }
  }

  return shell.run(installer, installerArgs, options);
}
