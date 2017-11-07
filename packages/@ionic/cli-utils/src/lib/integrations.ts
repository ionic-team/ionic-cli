import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import { copyDirectory, fsMkdirp, fsStat, pathExists, readDir, removeDirectory } from '@ionic/cli-framework/utils/fs';

import { IntegrationTemplate, IonicEnvironment } from '../definitions';
import { FatalException } from './errors';

export const INTEGRATIONS: IntegrationTemplate[] = [
  {
    name: 'cordova',
    archive: 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz',
  },
  {
    name: 'gulp',
  },
];

export async function enableIntegration(env: IonicEnvironment, id: string) {
  const project = await env.project.load();

  let projectIntegration = project.integrations[id];

  if (projectIntegration && projectIntegration.enabled !== false) {
    env.log.ok(`${chalk.green(id)} integration already enabled.`);
  } else {
    if (!projectIntegration) {
      projectIntegration = {};
    }

    if (projectIntegration.enabled === false) {
      projectIntegration.enabled = true;
      env.log.ok(`Enabled ${chalk.green(id)} integration!`);
    } else {
      const integration = INTEGRATIONS.find(i => i.name === id);

      if (!integration) {
        throw new FatalException(`Integration ${id} not found in integrations list.`);
      }

      await addIntegration(env, integration);

      env.log.ok(`Added ${chalk.green(id)} integration!`);
    }

    project.integrations[id] = projectIntegration;
  }

  await env.project.save();
}

export async function disableIntegration(env: IonicEnvironment, id: string) {
  const project = await env.project.load();
  let projectIntegration = project.integrations[id];

  if (!projectIntegration) {
    projectIntegration = {};
  }

  projectIntegration.enabled = false;
  project.integrations[id] = projectIntegration;

  env.log.ok(`Disabled ${chalk.green(id)} integration.`);
}

async function addIntegration(env: IonicEnvironment, integration: IntegrationTemplate) {
  if (!integration.archive) {
    return;
  }

  const { download } = await import('./http');
  const { createTarExtraction } = await import('./utils/archive');

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

  env.log.debug(() => `Integration files downloaded to ${chalk.bold(tmpdir)} (files: ${contents.map(f => chalk.bold(f)).join(', ')})`);

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
  env.log.debug(() => `Blacklist: ${blacklist.map(f => chalk.bold(f)).join(', ')}`);

  await copyDirectory(tmpdir, env.project.directory, {
    filter: f => {
      if (f === tmpdir) {
        return true;
      }

      const projectf = f.substring(tmpdir.length + 1);

      for (let item of blacklist) {
        if (item.slice(-1) === '/' && `${projectf}/` === item) {
          return false;
        }

        if (projectf.startsWith(item)) {
          return false;
        }
      }

      env.log.info(`${chalk.green.bold('create')} ${projectf}`);

      return true;
    },
  });

  env.tasks.end();
}
