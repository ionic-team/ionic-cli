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
  run: string;
  dedupe: string;
  rebuild: string;

  // flags
  global: string;
  save: string;
  saveDev: string;
  saveExact: string;
  nonInteractive: string;
}

export type PkgManagerCommand = 'dedupe' | 'rebuild' | 'install' | 'uninstall' | 'run';

export interface PkgManagerOptions extends IShellRunOptions {
  command?: PkgManagerCommand;
  pkg?: string;
  script?: string;
  scriptArgs?: string[];
  global?: boolean;
  save?: boolean;
  saveDev?: boolean;
  saveExact?: boolean;
}

/**
 * Resolves pkg manager intent with command args.
 *
 * TODO: this is a weird function and should be split up
 *
 * @return Promise<args> If the args is an empty array, it means the pkg manager doesn't have that command.
 */
export async function pkgManagerArgs(env: IonicEnvironment, options: PkgManagerOptions = {}): Promise<string[]> {
  let vocab: PkgManagerVocabulary;
  const config = await env.config.load();

  if (!options.command) {
    options.command = 'install';
  }

  let cmd = options.command;

  if (cmd === 'dedupe') {
    delete options.pkg;
  }

  if (cmd === 'dedupe' || cmd === 'rebuild') {
    delete options.global;
    delete options.save;
    delete options.saveDev;
  }

  if (cmd === 'dedupe' || cmd === 'rebuild' || cmd === 'uninstall') {
    delete options.saveExact;
  }

  if (cmd === 'install' || cmd === 'uninstall') {
    if (options.global) { // Turn off all save flags for global context
      options.save = false;
      options.saveDev = false;
      options.saveExact = false;
    } else if (options.pkg && typeof options.save === 'undefined' && typeof options.saveDev === 'undefined') { // Prefer save flag
      options.save = true;
    }

    if (cmd === 'install' && options.pkg && typeof options.saveExact === 'undefined') { // For single package installs, prefer to save exact versions
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
    vocab = { run: 'run', install: 'i', bareInstall: 'i', uninstall: 'uninstall', dedupe: 'dedupe', rebuild: 'rebuild', global: '-g', save: '--save', saveDev: '-D', saveExact: '-E', nonInteractive: '' };
  } else if (installer === 'yarn') {
    vocab = { run: 'run', install: 'add', bareInstall: 'install', uninstall: 'remove', dedupe: '', rebuild: 'install', global: '', save: '', saveDev: '--dev', saveExact: '--exact', nonInteractive: '--non-interactive' };

    if (options.global) { // yarn installs packages globally under the 'global' prefix, instead of having a flag
      installerArgs.push('global');
    }
  } else {
    throw new Error(`unknown installer: ${installer}`);
  }

  if (cmd === 'install') {
    if (options.pkg) {
      installerArgs.push(vocab.install);
    } else {
      installerArgs.push(vocab.bareInstall);
    }
  } else if (cmd === 'uninstall') {
    installerArgs.push(vocab.uninstall);
  } else if (cmd === 'dedupe') {
    if (vocab.dedupe) {
      installerArgs.push(vocab.dedupe);
    } else {
      return [];
    }
  } else if (cmd === 'rebuild') {
    installerArgs.push(vocab.rebuild);
  } else {
    installerArgs.push(cmd);
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
    installerArgs.push(options.pkg);
  }

  if (cmd === 'run' && options.script) {
    installerArgs.push(options.script);
  }

  if (installer === 'yarn') {
    if (cmd === 'rebuild') {
      installerArgs.push('--force');
    }
  }

  if (cmd === 'run' && options.script && options.scriptArgs && options.scriptArgs.length > 0) {
    if (installer === 'npm') {
      installerArgs.push('--');
    }

    for (let arg of options.scriptArgs) {
      installerArgs.push(arg);
    }
  }

  return [installer, ...installerArgs];
}

/**
 * TODO: switch this to use `package-json` module?
 *
 * @return Promise<latest version or `undefined`>
 */
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
