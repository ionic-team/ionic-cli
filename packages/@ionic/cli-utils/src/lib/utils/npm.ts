import * as path from 'path';

import chalk from 'chalk';

import { DistTag, IShellRunOptions, IonicEnvironment } from '../../definitions';
import { isExitCodeException } from '../../guards';
import { ERROR_SHELL_COMMAND_NOT_FOUND } from '../shell';

import { PackageJson } from '@ionic/cli-framework';
import { ERROR_FILE_NOT_FOUND } from '@ionic/cli-framework/utils/fs';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

/**
 * To be used with a module path resolved from require.resolve().
 */
export async function readPackageJsonFileOfResolvedModule(resolvedModule: string): Promise<PackageJson> {
  const p = path.dirname(path.dirname(resolvedModule)); // "main": <folder>/index.js

  try {
    return await readPackageJsonFile(path.resolve(p, 'package.json'));
  } catch (e) {
    if (e !== ERROR_FILE_NOT_FOUND) {
      throw e;
    }

    const p = path.dirname(resolvedModule); // "main": index.js
    return await readPackageJsonFile(path.resolve(p, 'package.json'));
  }
}

let installer: undefined | 'npm' | 'yarn';

interface PkgManagerVocabulary {
  // commands
  install: string;
  bareInstall: string;
  uninstall: string;
  dedupe: string;

  // flags
  global: string;
  save: string;
  saveDev: string;
  saveExact: string;
  nonInteractive: string;
}

export interface PkgManagerOptions extends IShellRunOptions {
  command?: 'dedupe' | 'install' | 'uninstall';
  pkg?: string;
  global?: boolean;
  link?: boolean;
  save?: boolean;
  saveDev?: boolean;
  saveExact?: boolean;
}

/**
 * Resolves pkg manager intent with command args.
 *
 * @return Promise<args> If the args is an empty array, it means the pkg manager doesn't have that command.
 */
export async function pkgManagerArgs(env: IonicEnvironment, options: PkgManagerOptions = {}): Promise<string[]> {
  let vocab: PkgManagerVocabulary;
  const config = await env.config.load();

  if (!options.command) {
    options.command = 'install';
  }

  let command: PkgManagerOptions['command'] | 'link' | 'unlink' = options.command;

  if (command === 'dedupe') {
    delete options.pkg;
    delete options.global;
    delete options.link;
    delete options.save;
    delete options.saveDev;
    delete options.saveExact;
  }

  if (command === 'uninstall') {
    delete options.saveExact;
  }

  if (command === 'install' || command === 'uninstall') {
    if (options.link) { // When installing/uninstalling with the link flag, change command
      options.global = false;

      if (command === 'install') {
        command = 'link';
      } else if (command === 'uninstall') {
        command = 'unlink';
      }
    }

    if (options.global || options.link) { // Turn off all save flags for global context or when using link/unlink
      options.save = false;
      options.saveDev = false;
      options.saveExact = false;
    } else if (options.pkg && typeof options.save === 'undefined' && typeof options.saveDev === 'undefined') { // Prefer save flag
      options.save = true;
    }

    if (command === 'install' && options.pkg && typeof options.saveExact === 'undefined') { // For single package installs, prefer to save exact versions
      options.saveExact = true;
    }
  }

  if (config.yarn) {
    if (!installer) {
      try {
        await env.shell.run('yarn', ['--version'], { fatalOnNotFound: false, showCommand: false });
        installer = 'yarn';
      } catch (e) {
        if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
          env.log.warn(`You have opted into yarn, but ${chalk.green('yarn')} was not found in your PATH.`);
        } else {
          env.log.debug(() => `Error running yarn: ${e}`);
        }

        installer = 'npm';
      }
    }
  } else {
    installer = 'npm';
  }

  const installerArgs: string[] = [];

  if (installer === 'npm') {
    vocab = { install: 'i', bareInstall: 'i', uninstall: 'uninstall', dedupe: 'dedupe', global: '-g', save: '--save', saveDev: '-D', saveExact: '-E', nonInteractive: '' };
  } else if (installer === 'yarn') {
    vocab = { install: 'add', bareInstall: 'install', uninstall: 'remove', dedupe: '', global: '', save: '', saveDev: '--dev', saveExact: '--exact', nonInteractive: '--non-interactive' };

    if (options.global) { // yarn installs packages globally under the 'global' prefix, instead of having a flag
      installerArgs.push('global');
    }
  } else {
    throw new Error(`unknown installer: ${installer}`);
  }

  if (command === 'install') {
    if (options.pkg) {
      installerArgs.push(vocab.install);
    } else {
      installerArgs.push(vocab.bareInstall);
    }
  } else if (command === 'uninstall') {
    installerArgs.push(vocab.uninstall);
  } else if (command === 'dedupe') {
    if (vocab.dedupe) {
      installerArgs.push(vocab.dedupe);
    } else {
      return [];
    }
  } else {
    installerArgs.push(command);
  }

  if (options.global && vocab.global) {
    installerArgs.push(vocab.global);
  }

  if (options.save && vocab.save) {
    installerArgs.push(vocab.save);
  }

  if (options.saveDev && vocab.saveDev) {
    installerArgs.push(vocab.saveDev);
  }

  if (options.saveExact && vocab.saveExact) {
    installerArgs.push(vocab.saveExact);
  }

  if (vocab.nonInteractive) { // Some CLIs offer a flag that disables all interactivity, which we want to opt-into
    installerArgs.push(vocab.nonInteractive);
  }

  if (options.pkg) {
    if (options.link) {
      options.pkg = options.pkg.replace(/(.+)@.+/, '$1'); // Removes any dist tags in the pkg name, which link/unlink hate
    }

    installerArgs.push(options.pkg);
  }

  return [installer, ...installerArgs];
}

export async function pkgLatestVersion(env: IonicEnvironment, pkg: string, distTag: DistTag = 'latest'): Promise<string | undefined> {
  const config = await env.config.load();
  const shellOptions = { fatalOnError: false, showCommand: false };

  try {
    if (config.yarn) {
      const cmdResult = await env.shell.run('yarn', ['info', pkg, `dist-tags.${distTag}`, '--json'], shellOptions);
      return JSON.parse(cmdResult).data;
    } else {
      const cmdResult = await env.shell.run('npm', ['view', pkg, `dist-tags.${distTag}`, '--json'], shellOptions);

      if (cmdResult) {
        return JSON.parse(cmdResult);
      }
    }
  } catch (e) {
    if (e.fatal || !isExitCodeException(e)) {
      throw e;
    }
  }
}
