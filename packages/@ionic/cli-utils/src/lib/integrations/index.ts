import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import { copyDirectory, fsMkdirp, fsStat, pathExists, readDir, removeDirectory } from '@ionic/cli-framework/utils/fs';

import { IIntegration, IProject, IShell, InfoHookItem, IntegrationName, IntegrationTemplate, IonicEnvironment, ProjectPersonalizationDetails } from '../../definitions';
import { FatalException } from '../errors';

import * as cordovaLibType from './cordova';

const debug = Debug('ionic:cli-utils:lib:integrations');

export const INTEGRATIONS: IntegrationTemplate[] = [
  {
    name: 'cordova',
    archive: 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz',
  },
];

export interface IntegrationOptions {
  quiet?: boolean;
}

export interface IntegrationDeps {
  shell: IShell;
  project: IProject;
}

export abstract class BaseIntegration implements IIntegration {
  shell: IShell;
  project: IProject;

  abstract name: IntegrationName;

  constructor({ shell, project }: IntegrationDeps) {
    this.shell = shell;
    this.project = project;
  }

  static async createFromName(deps: IntegrationDeps, name: 'cordova'): Promise<cordovaLibType.Integration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<IIntegration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<IIntegration> {
    if (name === 'cordova') {
      const { Integration } = await import('./cordova');
      return new Integration(deps);
    }

    throw new FatalException(`Bad integration name: ${chalk.bold(name)}`); // TODO?
  }

  abstract getInfo(): Promise<InfoHookItem[]>;

  async personalize(details: ProjectPersonalizationDetails) {
    // overwritten by subclasses
  }
}

export async function enableIntegration(env: IonicEnvironment, id: string, opts: IntegrationOptions = {}) {
  const integration = INTEGRATIONS.find(i => i.name === id);

  if (!integration) {
    throw new FatalException(`Integration ${chalk.green(id)} not found in integrations list.`);
  }

  const project = await env.project.load();
  let projectIntegration = project.integrations[integration.name];

  if (projectIntegration && projectIntegration.enabled !== false) {
    env.log.ok(`${chalk.green(integration.name)} integration already enabled.`);
  } else {
    if (!projectIntegration) {
      projectIntegration = {};
    }

    if (projectIntegration.enabled === false) {
      projectIntegration.enabled = true;
    } else {
      await addIntegration(env, integration, opts);
    }

    project.integrations[integration.name] = projectIntegration;
  }

  await env.project.refreshIntegrations();
  await env.project.save();

  if (projectIntegration.enabled) {
    env.log.ok(`Enabled ${chalk.green(integration.name)} integration!`);
  } else {
    env.log.ok(`Added ${chalk.green(integration.name)} integration!`);
  }
}

export async function disableIntegration(env: IonicEnvironment, id: string) {
  const integration = INTEGRATIONS.find(i => i.name === id);

  if (!integration) {
    throw new FatalException(`Integration ${chalk.green(id)} not found in integrations list.`);
  }

  const project = await env.project.load();
  let projectIntegration = project.integrations[integration.name];

  if (!projectIntegration) {
    projectIntegration = {};
  }

  projectIntegration.enabled = false;
  project.integrations[integration.name] = projectIntegration;

  await env.project.refreshIntegrations();
  await env.project.save();

  env.log.ok(`Disabled ${chalk.green(integration.name)} integration.`);
}

async function addIntegration(env: IonicEnvironment, integration: IntegrationTemplate, opts: IntegrationOptions) {
  if (!integration.archive) {
    return;
  }

  const { download } = await import('../http');
  const { createTarExtraction } = await import('../utils/archive');

  const task = env.tasks.next(`Downloading integration ${chalk.green(integration.name)}`);

  const tmpdir = path.resolve(os.tmpdir(), `ionic-integration-${integration.name}`);

  // TODO: etag

  if (await pathExists(tmpdir)) {
    await removeDirectory(tmpdir);
  }

  await fsMkdirp(tmpdir, 0o777);

  const ws = await createTarExtraction({ cwd: tmpdir });
  await download(env.config, integration.archive, ws, {
    progress: (loaded, total) => task.progress(loaded, total),
  });
  env.tasks.end();

  const contents = await readDir(tmpdir);
  const blacklist: string[] = [];

  debug(`Integration files downloaded to ${chalk.bold(tmpdir)} (files: ${contents.map(f => chalk.bold(f)).join(', ')})`);

  for (let f of contents) {
    const projectf = path.resolve(env.project.directory, f);

    try {
      let t = 'file';
      const stats = await fsStat(projectf);

      if (stats.isDirectory()) {
        f = `${f}/`;
        t = 'directory';
      }

      const confirm = await env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `The ${chalk.cyan(f)} ${t} exists in project. Overwrite?`,
        default: false,
      });

      if (!confirm) {
        blacklist.push(f);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  env.tasks.next(`Copying integrations files to project`);
  debug(`Blacklist: ${blacklist.map(f => chalk.bold(f)).join(', ')}`);

  await copyDirectory(tmpdir, env.project.directory, {
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

      if (!opts.quiet) {
        env.log.msg(`  ${chalk.green('create')} ${projectf}`);
      }

      return true;
    },
  });

  env.tasks.end();
}
