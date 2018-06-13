import { conform } from '@ionic/cli-framework/utils/array';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { PROJECT_FILE } from '../constants';
import { HookFn, HookInput, HookName, IConfig, IProject, IShell } from '../definitions';

import { HookException } from './errors';

const debug = Debug('ionic:cli-utils:lib:hooks');

export interface HookDeps {
  readonly config: IConfig;
  readonly project: IProject;
  readonly shell: IShell;
}

export abstract class Hook {
  abstract readonly name: HookName;

  protected readonly config: IConfig;
  protected readonly project: IProject;
  protected readonly shell: IShell;

  get script() {
    return `ionic:${this.name}`;
  }

  constructor({ config, project, shell }: HookDeps) {
    this.config = config;
    this.project = project;
    this.shell = shell;
  }

  async run(input: HookInput) {
    const { pkgManagerArgs } = await import('./utils/npm');

    const type = this.project.type;

    if (!type || !this.project.directory) {
      return; // TODO: will we need hooks outside a project?
    }

    const projectConfig = await this.project.load();
    const pkg = await this.project.requirePackageJson();
    const config = await this.config.load();
    const { npmClient } = config;

    debug(`Looking for ${chalk.cyan(this.script)} npm script.`);

    if (pkg.scripts && pkg.scripts[this.script]) {
      debug(`Invoking ${chalk.cyan(this.script)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: this.script });
      await this.shell.run(pkgManager, pkgArgs, {});
    }

    const hooks = projectConfig.hooks ? conform(projectConfig.hooks[this.name]) : [];

    for (const h of hooks) {
      const p = path.resolve(this.project.directory, h);

      try {
        if (path.extname(p) !== '.js') {
          throw new Error(`Hooks must be .js files with a function for its default export.`);
        }

        const hook = await this.loadHookFn(p);

        if (!hook) {
          throw new Error(`Module must have a function for its default export.`);
        }

        await hook(lodash.assign({}, input, {
          project: {
            type,
            dir: this.project.directory,
            srcDir: await this.project.getSourceDir(),
          },
          argv: process.argv,
          env: process.env,
        }));
      } catch (e) {
        throw new HookException(
          `An error occurred while running an Ionic CLI hook defined in ${chalk.bold(PROJECT_FILE)}.\n` +
          `Hook: ${chalk.bold(this.name)}\n` +
          `File: ${chalk.bold(p)}\n\n` +
          `${chalk.red(e.stack ? e.stack : e)}`
        );
      }
    }
  }

  protected async loadHookFn(p: string): Promise<HookFn | undefined> {
    const module = require(p);

    if (typeof module === 'function') {
      return module;
    } else if (typeof module.default === 'function') {
      return module.default;
    }

    debug(`Could not load hook function ${chalk.bold(p)}: %o not a function`, module);
  }
}

export function addHook(baseDir: string, hooks: string | string[] | undefined, hook: string): string[] {
  const hookPaths = conform(hooks);
  const resolvedHookPaths = hookPaths.map(p => path.resolve(baseDir, p));

  if (!resolvedHookPaths.includes(path.resolve(baseDir, hook))) {
    hookPaths.push(hook);
  }

  return hookPaths;
}

export function removeHook(baseDir: string, hooks: string | string[] | undefined, hook: string): string[] {
  const hookPaths = conform(hooks);
  const i = locateHook(baseDir, hookPaths, hook);

  if (i >= 0) {
    hookPaths.splice(i, 1);
  }

  return hookPaths;
}

export function locateHook(baseDir: string, hooks: string[], hook: string): number {
  return conform(hooks).map(p => path.resolve(baseDir, p)).indexOf(path.resolve(baseDir, hook));
}
