import { columnar, prettyPath } from '@ionic/cli-framework/utils/format';
import { pathExists, readDirSafe, readFile } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import { APIResponseSuccess, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { build } from '../../lib/build';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

const debug = Debug('ionic:commands:monitoring:syncmaps');

const SOURCEMAP_DIRECTORY = '.sourcemaps';

export class MonitoringSyncSourcemapsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'syncmaps',
      type: 'project',
      summary: 'Build & upload sourcemaps to Ionic Appflow Monitoring service',
      description: `
By default, ${chalk.green('ionic monitoring syncmaps')} will upload the sourcemap files within ${chalk.bold(SOURCEMAP_DIRECTORY)}. To optionally perform a production build before uploading sourcemaps, specify the ${chalk.green('--build')} flag.
      `,
      inputs: [
        {
          name: 'snapshot_id',
          summary: `Specify a Snapshot ID to associate the uploaded sourcemaps with`,
        },
      ],
      options: [
        {
          name: 'build',
          summary: 'Invoke a production Ionic build',
          type: Boolean,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { loadConfigXml } = await import('../../lib/integrations/cordova/config');

    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic monitoring syncmaps')} outside a project directory.`);
    }

    const token = this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();

    const [ snapshotId ] = inputs;
    const doBuild = options.build ? true : false;

    const cordova = this.project.requireIntegration('cordova');
    const conf = await loadConfigXml(cordova);
    const cordovaInfo = conf.getProjectInfo();

    const appVersion = cordovaInfo.version;
    const commitHash = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
    debug(`Commit hash: ${chalk.bold(commitHash)}`);

    const sourcemapsDir = path.resolve(this.project.directory, SOURCEMAP_DIRECTORY);
    let sourcemapsExist = await pathExists(sourcemapsDir);

    if (doBuild || !sourcemapsExist) {
      // TODO: use runner directly
      await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, [], { _: [], prod: true });
    }

    sourcemapsExist = await pathExists(sourcemapsDir);

    if (sourcemapsExist) {
      this.env.log.msg(`Using existing sourcemaps in ${chalk.bold(prettyPath(sourcemapsDir))}`);
    } else { // TODO: this is hard-coded for ionic-angular, make it work for all project types
      throw new FatalException(
        `Cannot find directory: ${chalk.bold(prettyPath(sourcemapsDir))}.\n` +
        `Make sure you have the latest ${chalk.bold('@ionic/app-scripts')}. Then, re-run this command.`
      );
    }

    let count = 0;
    const tasks = this.createTaskChain();
    const syncTask = tasks.next('Syncing sourcemaps');

    const sourcemapFiles = (await readDirSafe(sourcemapsDir)).filter(f => f.endsWith('.js.map'));
    debug(`Found ${sourcemapFiles.length} sourcemap files: ${sourcemapFiles.map(f => chalk.bold(f)).join(', ')}`);

    await Promise.all(sourcemapFiles.map(async f => {
      await this.syncSourcemap(path.resolve(sourcemapsDir, f), snapshotId, appVersion, commitHash, appflowId, token);
      count += 1;
      syncTask.msg = `Syncing sourcemaps: ${chalk.bold(`${count} / ${sourcemapFiles.length}`)}`;
    }));

    syncTask.msg = `Syncing sourcemaps: ${chalk.bold(`${sourcemapFiles.length} / ${sourcemapFiles.length}`)}`;
    tasks.end();

    const details = columnar([
      ['Appflow ID', chalk.bold(appflowId)],
      ['Version', chalk.bold(appVersion)],
      ['Package ID', chalk.bold(cordovaInfo.id)],
      ['Snapshot ID', snapshotId ? chalk.bold(snapshotId) : chalk.dim('not set')],
    ], { vsep: ':' });

    this.env.log.ok(
      `Sourcemaps synced!\n` +
      details + '\n\n' +
      `See the Error Monitoring docs for usage information and next steps: ${chalk.bold('https://ionicframework.com/docs/appflow/monitoring')}`
    );
  }

  async syncSourcemap(file: string, snapshotId: string, appVersion: string, commitHash: string, appflowId: string, token: string): Promise<void> {
    const { req } = await this.env.client.make('POST', `/monitoring/${appflowId}/sourcemaps`);

    req
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: path.basename(file),
        version: appVersion,
        commit: commitHash,
        snapshot_id: snapshotId,
      });

    try {
      const res = await this.env.client.do(req);

      return this.uploadSourcemap(res, file);
    } catch (e) {
      if (isSuperAgentError(e)) {
        this.env.log.error(`Unable to sync map ${file}: ` + e.message);
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
      } else {
        throw e;
      }
    }
  }

  async uploadSourcemap(sourcemap: APIResponseSuccess, file: string) {
    const { createRequest } = await import('../../lib/utils/http');

    const sm = sourcemap as any;

    const fileData = await readFile(file, { encoding: 'utf8' });
    const sourcemapPost = sm.data.sourcemap_post;

    const { req } = await createRequest('POST', sourcemapPost.url, this.env.config.getHTTPConfig());

    req
      .field(sourcemapPost.fields)
      .field('file', fileData);

    const res = await req;

    if (res.status !== 204) {
      throw new FatalException(`Unexpected status code from AWS: ${res.status}`);
    }
  }
}
