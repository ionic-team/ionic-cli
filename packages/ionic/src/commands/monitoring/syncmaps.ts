import * as path from 'path';

import chalk from 'chalk';

import { APIResponseSuccess } from '@ionic/cli-utils/definitions';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { isSuperAgentError } from '@ionic/cli-utils/guards';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { fsReadFile, pathExists, readDir } from '@ionic/cli-framework/utils/fs';

@CommandMetadata({
  name: 'syncmaps',
  type: 'project',
  backends: [BACKEND_PRO],
  description: 'Sync Source Maps to Ionic Pro Error Monitoring service',
  inputs: [
    {
      name: 'snapshot_id',
      description: `An Ionic Pro snapshot id to associate these sourcemaps with.`,
      required: false
    }
  ],
})
export class MonitoringSyncSourcemapsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>  {
    const token = await this.env.session.getUserToken();
    const appId = await this.env.project.loadAppId();

    const [ snapshotId ] = inputs;

    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const conf = await ConfigXml.load(this.env.project.directory);
    const cordovaInfo = conf.getProjectInfo();

    const appVersion = cordovaInfo.version;
    const commitHash = await this.env.shell.run('git', ['rev-parse', 'HEAD'], { cwd: this.env.project.directory });

    const sourcemapsDir = path.join(this.env.project.directory, '.sourcemaps');

    let sourcemapsExist = await pathExists(sourcemapsDir);

    if (!sourcemapsExist) {
      this.env.log.info('No sourcemaps found, doing build...');
      await this.doProdBuild();
      sourcemapsExist = await pathExists(sourcemapsDir);
      if (!sourcemapsExist) {
        this.env.log.error('Unable to sync sourcemaps. Make sure you have @ionic/app-scripts version 2.1.4 or greater.');
        return;
      }
    } else {
      const doNewBuild = await this.env.prompt({
        type: 'confirm',
        name: 'isProd',
        message: 'Do build before syncing?'
      });
      doNewBuild && await this.doProdBuild();
    }

    this.env.log.info(`Syncing SourceMaps for app version ${chalk.green(appVersion)} of ${chalk.green(cordovaInfo.id)} (snapshot: ${snapshotId})- App ID ${appId}`);
    readDir(sourcemapsDir).then(files => {
      const maps = files.filter(f => f.indexOf('.js.map') >= 0);
      Promise.all(maps.map(f => this.syncSourcemap(path.join(sourcemapsDir, f), snapshotId, appVersion, commitHash, appId, token)));
    });
  }

  async syncSourcemap(file: string, snapshotId: string, appVersion: string, commitHash: string, appId: string, token: string): Promise<void> {
    const { createFatalAPIFormat } = await import('@ionic/cli-utils/lib/http');

    const { req } = await this.env.client.make('POST', `/monitoring/${appId}/sourcemaps`);

    req
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: path.basename(file),
        version: appVersion,
        commit: commitHash,
        snapshot_id: snapshotId
      });

    try {
      this.env.log.info(`Syncing ${chalk.green(file)}`);
      const res = await this.env.client.do(req);

      if (res.meta.status !== 201) {
        throw createFatalAPIFormat(req, res);
      }

      return this.uploadSourcemap(res, file);
    } catch (e) {
      if (isSuperAgentError(e)) {
        this.env.log.error(`Unable to sync map ${file}: ` + e.message);
        if (e.response.status === 401) {
          this.env.log.error('Try logging out and back in again.');
        }
        this.env.tasks.fail();
      } else {
        throw e;
      }
    }
  }

  async uploadSourcemap(res: APIResponseSuccess, file: string) {
    const { createRequest } = await import('@ionic/cli-utils/lib/http');

    const r = <any>res;

    const fileData = await fsReadFile(file, { encoding: 'utf8' });
    const sourcemapPost = r.data.sourcemap_post;

    this.env.log.info('Doing this thing');
    this.env.log.info(await this.env.config.getAPIUrl());

    let { req } = await createRequest(this.env.config, 'post', sourcemapPost.url);
    req = req
      .buffer()
      .field(sourcemapPost.fields)
      .field('file', fileData)
      .on('progress', (event: any) => {
      })
      .end((err: any, res: any) => {
        if (err) {
          this.env.log.error('Unable to upload sourcemap');
          this.env.log.error(err);
          return Promise.reject(err);
        }
        if (res.status !== 204) {
          return Promise.reject(new Error(`Unexpected status code from AWS: ${res.status}`));
        }

        this.env.log.ok('Uploaded sourcemap');
        this.env.log.info('See the Error Monitoring docs for usage information and next steps: http://ionicframework.com/docs/pro/monitoring/');

        Promise.resolve();
      });
  }

  async doProdBuild() {
    const isProd = await this.env.prompt({
      type: 'confirm',
      name: 'isProd',
      message: 'Do full prod build?'
    });

    const { build } = await import('@ionic/cli-utils/commands/build');
    return await build(this.env, [], { _: [], prod: isProd });
  }
}
