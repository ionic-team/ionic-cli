import * as chalk from 'chalk';

import { BowerJson, IonicEnvironment, IShellRunOptions, PackageJson } from '../../definitions';
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

export interface PkgInstallOptions extends IShellRunOptions {
  global?: boolean;
  link?: boolean;
}

export async function pkgInstallArgs(env: IonicEnvironment, pkg?: string, options: PkgInstallOptions = {}): Promise<string[]> {
  const config = await env.config.load();

  if (config.cliFlags.yarn) {
    if (!installer) {
      try {
        await runcmd('yarn', ['--version']); // TODO cache
        installer = 'yarn';
      } catch (e) {
        if (e.code === 'ENOENT') {
          env.log.warn(`You have opted into yarn, but ${chalk.green('yarn')} was not found in PATH`);
        }

        installer = 'npm';
      }
    }
  } else {
    installer = 'npm';
  }

  let installerArgs = [];

  // TODO: handle --save, --save-peer, etc

  if (installer === 'npm') {
    if (pkg) {
      if (options.link) {
        installerArgs = ['link', pkg.replace(/(.+)@.+/, '$1')];
      } else {
        if (options.global) {
          installerArgs = ['install', '-g', pkg];
        } else {
          installerArgs = ['install', '--save-dev', '--save-exact', pkg];
        }
      }
    } else {
      installerArgs = ['install'];
    }
  } else {
    if (pkg) {
      if (options.link) {
        installerArgs = ['link', pkg];
      } else {
        if (options.global) {
          installerArgs = ['global', 'add', '--non-interactive', pkg];
        } else {
          installerArgs = ['add', '--non-interactive', '--dev', '--exact', pkg];
        }
      }
    } else {
      installerArgs = ['install', '--non-interactive'];
    }
  }

  return [installer, ...installerArgs];
}
