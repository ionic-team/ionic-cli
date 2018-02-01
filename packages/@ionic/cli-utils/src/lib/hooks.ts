import * as path from 'path';
import * as util from 'util';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { conform } from '@ionic/cli-framework/utils/fn';

import { HookFn, HookInput, HookName, IConfig, IProject, IShell } from '../definitions';
import { HookException } from './errors';
import { PROJECT_FILE } from './project';

const debug = Debug('ionic:cli-utils:lib:hooks');

export interface HookDeps {
  config: IConfig;
  project: IProject;
  shell: IShell;
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

    const project = await this.project.load();
    const pkg = await this.project.loadPackageJson();
    const config = await this.config.load();
    const { npmClient } = config;

    debug(`Looking for ${chalk.cyan(this.script)} npm script.`);

    if (pkg.scripts && pkg.scripts[this.script]) {
      debug(`Invoking ${chalk.cyan(this.script)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.shell }, { command: 'run', script: this.script });
      await this.shell.run(pkgManager, pkgArgs, {});
    }

    const hooks = conform(project.hooks[this.name]);

    for (const h of hooks) {
      const p = path.resolve(this.project.directory, h);

      try {
        const hook = await this.loadHookFn(p);

        if (!hook) {
          throw new Error(`Module must have a function for its default export.`);
        }

        await hook(lodash.assign({}, input, {
          project: {
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

    const inspection = util.inspect(module, { colors: chalk.enabled });
    debug(`Could not load hook function ${chalk.bold(p)}: ${inspection} not a function`);
  }
}
