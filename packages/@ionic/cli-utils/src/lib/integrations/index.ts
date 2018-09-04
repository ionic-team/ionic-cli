import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { copyDirectory, mkdirp, pathExists, readDirSafe, removeDirectory, stat } from '@ionic/utils-fs';

import { IConfig, IIntegration, IIntegrationAddOptions, ILogger, IProject, IShell, InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../definitions';
import { IntegrationNotFoundException } from '../errors';

import * as ζcapacitor from './capacitor';
import * as ζcordova from './cordova';

export { INTEGRATION_NAMES } from '../../guards';

const debug = Debug('ionic:cli-utils:lib:integrations');

export interface IntegrationOptions {
  quiet?: boolean;
}

export interface IntegrationDeps {
  readonly config: IConfig;
  readonly shell: IShell;
  readonly project: IProject;
  readonly log: ILogger;
}

export abstract class BaseIntegration implements IIntegration {
  abstract readonly name: IntegrationName;
  abstract readonly summary: string;
  abstract readonly archiveUrl?: string;

  constructor(protected readonly e: IntegrationDeps) {}

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

    this.e.log.info(`Downloading integration ${chalk.green(this.name)}`);
    const tmpdir = path.resolve(os.tmpdir(), `ionic-integration-${this.name}`);

    // TODO: etag

    if (await pathExists(tmpdir)) {
      await removeDirectory(tmpdir);
    }

    await mkdirp(tmpdir, 0o777);

    const ws = tar.extract({ cwd: tmpdir });
    const { req } = await createRequest('GET', this.archiveUrl, this.e.config.getHTTPConfig());
    await download(req, ws, {});

    const contents = await readDirSafe(tmpdir);
    const blacklist: string[] = [];

    debug(`Integration files downloaded to ${chalk.bold(tmpdir)} (files: ${contents.map(f => chalk.bold(f)).join(', ')})`);

    for (const f of contents) {
      const projectf = path.resolve(this.e.project.directory, f);

      try {
        const stats = await stat(projectf);
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

    this.e.log.info(`Copying integrations files to project`);
    debug(`Blacklist: ${blacklist.map(f => chalk.bold(f)).join(', ')}`);

    await copyDirectory(tmpdir, this.e.project.directory, {
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

    await this.enable();
  }
}
