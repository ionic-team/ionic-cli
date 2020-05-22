import { columnar, prettyPath } from '@ionic/cli-framework/utils/format';
import { pathExists, readFile, readdirSafe } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as path from 'path';

import { APIResponseSuccess, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { input, strong, weak } from '../../lib/color';
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
By default, ${input('ionic monitoring syncmaps')} will upload the sourcemap files within ${strong(SOURCEMAP_DIRECTORY)}. To optionally perform a production build before uploading sourcemaps, specify the ${input('--build')} flag.
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
    const { loadCordovaConfig } = await import('../../lib/integrations/cordova/config');

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic monitoring syncmaps')} outside a project directory.`);
    }

    const token = await this.env.session.getUserToken();
    const appflowId = await this.project.requireAppflowId();

    const [ snapshotId ] = inputs;
    const doBuild = options.build ? true : false;

    const cordova = this.project.requireIntegration('cordova');
    const conf = await loadCordovaConfig(cordova);
    const cordovaInfo = conf.getProjectInfo();

    const appVersion = cordovaInfo.version;
    const commitHash = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
    debug(`Commit hash: ${strong(commitHash)}`);

    const sourcemapsDir = path.resolve(this.project.directory, SOURCEMAP_DIRECTORY);
    let sourcemapsExist = await pathExists(sourcemapsDir);

    if (doBuild || !sourcemapsExist) {
      const runner = await this.project.requireBuildRunner();
      const runnerOpts = runner.createOptionsFromCommandLine([], { _: [], prod: true });
      await runner.run(runnerOpts);
    }

    sourcemapsExist = await pathExists(sourcemapsDir);

    if (sourcemapsExist) {
      this.env.log.msg(`Using existing sourcemaps in ${strong(prettyPath(sourcemapsDir))}`);
    } else { // TODO: this is hard-coded for ionic-angular, make it work for all project types
      throw new FatalException(
        `Cannot find directory: ${strong(prettyPath(sourcemapsDir))}.\n` +
        `Make sure you have the latest ${strong('@ionic/app-scripts')}. Then, re-run this command.`
      );
    }

    let count = 0;
    const tasks = this.createTaskChain();
    const syncTask = tasks.next('Syncing sourcemaps');

    const sourcemapFiles = (await readdirSafe(sourcemapsDir)).filter(f => f.endsWith('.js.map'));
    debug(`Found ${sourcemapFiles.length} sourcemap files: ${sourcemapFiles.map(f => strong(f)).join(', ')}`);

    await Promise.all(sourcemapFiles.map(async f => {
      await this.syncSourcemap(path.resolve(sourcemapsDir, f), snapshotId, appVersion, commitHash, appflowId, token);
      count += 1;
      syncTask.msg = `Syncing sourcemaps: ${strong(`${count} / ${sourcemapFiles.length}`)}`;
    }));

    syncTask.msg = `Syncing sourcemaps: ${strong(`${sourcemapFiles.length} / ${sourcemapFiles.length}`)}`;
    tasks.end();

    const details = columnar([
      ['App ID', strong(appflowId)],
      ['Version', strong(appVersion)],
      ['Package ID', strong(cordovaInfo.id)],
      ['Snapshot ID', snapshotId ? strong(snapshotId) : weak('not set')],
    ], { vsep: ':' });

    this.env.log.ok(
      `Sourcemaps synced!\n` +
      details + '\n\n' +
      `See the Error Monitoring docs for usage information and next steps: ${strong('https://ionicframework.com/docs/appflow/monitoring')}`
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
