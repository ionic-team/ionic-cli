import { prettyPath } from '@ionic/cli-framework/utils/format';
import { conform } from '@ionic/utils-array';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

import { HookFn, HookInput, HookName, IConfig, IProject, IShell } from '../definitions';

import { ancillary, failure, strong } from './color';
import { HookException } from './errors';

const debug = Debug('ionic:lib:hooks');

export interface HookDeps {
  readonly config: IConfig;
  readonly project: IProject;
  readonly shell: IShell;
}

export abstract class Hook {
  abstract readonly name: HookName;

  get script() {
    return `ionic:${this.name}`;
  }

  constructor(protected readonly e: HookDeps) {}

  async run(input: HookInput) {
    const { pkgManagerArgs } = await import('./utils/npm');

    const type = this.e.project.type;

    if (!type || !this.e.project.directory) {
      return; // TODO: will we need hooks outside a project?
    }

    const pkg = await this.e.project.requirePackageJson();

    debug(`Looking for ${ancillary(this.script)} npm script.`);

    if (pkg.scripts && pkg.scripts[this.script]) {
      debug(`Invoking ${ancillary(this.script)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
      await this.e.shell.run(pkgManager, pkgArgs, {});
    }

    const projectHooks = this.e.project.config.get('hooks');
    const hooks = projectHooks ? conform(projectHooks[this.name]) : [];

    for (const h of hooks) {
      const p = path.resolve(this.e.project.directory, h);

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
            dir: this.e.project.directory,
            srcDir: await this.e.project.getSourceDir(),
          },
          argv: process.argv,
          env: process.env,
        }));
      } catch (e) {
        throw new HookException(
          `An error occurred while running an Ionic CLI hook defined in ${strong(prettyPath(this.e.project.filePath))}.\n` +
          `Hook: ${strong(this.name)}\n` +
          `File: ${strong(p)}\n\n` +
          `${failure(e.stack ? e.stack : e)}`
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

    debug(`Could not load hook function ${strong(p)}: %o not a function`, module);
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
