import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { TaskChain } from '@ionic/cli-framework';
import { copyDirectory, fsMkdirp, fsStat, pathExists, readDir, removeDirectory } from '@ionic/cli-framework/utils/fs';

import { IConfig, IIntegration, IIntegrationAddOptions, IProject, IShell, InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../definitions';
import { IntegrationNotFoundException } from '../errors';

import * as ζcapacitor from './capacitor';
import * as ζcordova from './cordova';

export { INTEGRATION_NAMES } from '../../guards';

const debug = Debug('ionic:cli-utils:lib:integrations');

export interface IntegrationOptions {
  quiet?: boolean;
}

export interface IntegrationDeps {
  config: IConfig;
  shell: IShell;
  project: IProject;
  tasks: TaskChain;
}

export abstract class BaseIntegration implements IIntegration {
  protected readonly config: IConfig;
  protected readonly project: IProject;
  protected readonly shell: IShell;
  protected readonly tasks: TaskChain;

  abstract readonly name: IntegrationName;
  abstract readonly summary: string;
  abstract readonly archiveUrl?: string;

  constructor({ config, project, shell, tasks }: IntegrationDeps) {
    this.config = config;
    this.project = project;
    this.shell = shell;
    this.tasks = tasks;
  }

  static async createFromName(deps: IntegrationDeps, name: 'capacitor'): Promise<ζcapacitor.Integration>;
  static async createFromName(deps: IntegrationDeps, name: 'cordova'): Promise<ζcordova.Integration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<IIntegration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<IIntegration> {
    if (name === 'capacitor') {
      const { Integration } = await import('./capacitor');
      return new Integration(deps);
    } else if (name === 'cordova') {
      const { Integration } = await import('./cordova');
      return new Integration(deps);
    }

    throw new IntegrationNotFoundException(`Bad integration name: ${chalk.bold(name)}`); // TODO?
  }

  async getInfo(): Promise<InfoItem[]> {
    return [];
  }

  async enable(): Promise<void> {
    // optionally overwritten by subclasses
  }

  async disable(): Promise<void> {
    // optionally overwritten by subclasses
  }

  async personalize(details: ProjectPersonalizationDetails) {
    // optionally overwritten by subclasses
  }

  async add(opts?: IIntegrationAddOptions): Promise<void> {
    if (!this.archiveUrl) {
      return;
    }

    const onFileCreate = opts && opts.onFileCreate ? opts.onFileCreate : lodash.noop;
    const conflictHandler = opts && opts.conflictHandler ? opts.conflictHandler : async () => false;

    const { createRequest, download } = await import('../utils/http');
    const { tar } = await import('../utils/archive');

    const task = this.tasks.next(`Downloading integration ${chalk.green(this.name)}`);
    const tmpdir = path.resolve(os.tmpdir(), `ionic-integration-${this.name}`);

    // TODO: etag

    if (await pathExists(tmpdir)) {
      await removeDirectory(tmpdir);
    }

    await fsMkdirp(tmpdir, 0o777);

    const ws = tar.extract({ cwd: tmpdir });
    const c = await this.config.load();
    const { req } = await createRequest('GET', this.archiveUrl, c);
    await download(req, ws, { progress: (loaded, total) => task.progress(loaded, total) });
    this.tasks.end();

    const contents = await readDir(tmpdir);
    const blacklist: string[] = [];

    debug(`Integration files downloaded to ${chalk.bold(tmpdir)} (files: ${contents.map(f => chalk.bold(f)).join(', ')})`);

    for (const f of contents) {
      const projectf = path.resolve(this.project.directory, f);

      try {
        const stats = await fsStat(projectf);
        const overwrite = await conflictHandler(projectf, stats);

        if (!overwrite) {
          blacklist.push(f);
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }

    this.tasks.next(`Copying integrations files to project`);
    debug(`Blacklist: ${blacklist.map(f => chalk.bold(f)).join(', ')}`);

    await copyDirectory(tmpdir, this.project.directory, {
      filter: f => {
        if (f === tmpdir) {
          return true;
        }

        const projectf = f.substring(tmpdir.length + 1);

        for (const item of blacklist) {
          if (item.slice(-1) === '/' && `${projectf}/` === item) {
            return false;
          }

          if (projectf.startsWith(item)) {
            return false;
          }
        }

        onFileCreate(projectf);

        return true;
      },
    });

    this.tasks.end();

    await this.enable();
  }
}
