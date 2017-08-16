import * as path from 'path';

import * as chalk from 'chalk';

import { APIResponseSuccess } from '@ionic/cli-utils/definitions';

import { BACKEND_PRO, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { createFatalAPIFormat } from '@ionic/cli-utils/lib/http';
import { createRequest } from '@ionic/cli-utils/lib/utils/http';
import { fsReadFile, pathExists, readDir } from '@ionic/cli-utils/lib/utils/fs';
import { isSuperAgentError } from '@ionic/cli-utils/guards';

@CommandMetadata({
  name: 'syncmaps',
  type: 'project',
  backends: [BACKEND_PRO],
  description: 'Sync Source Maps to Ionic Pro Error Monitoring service'
})
export class MonitoringSyncSourcemapsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>  {
    console.log('Syncing sourcemaps', inputs, options);

    const token = await this.env.session.getUserToken();
    const appId = await this.env.project.loadAppId();

    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const conf = await ConfigXml.load(this.env.project.directory);
    const cordovaInfo = await conf.getProjectInfo();

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

    this.env.log.info(`Syncing SourceMaps for app version ${chalk.green(appVersion)} of ${chalk.green(cordovaInfo.id)}`);
    readDir(sourcemapsDir).then(files => {
      const maps = files.filter(f => f.indexOf('.js.map') >= 0);
      Promise.all(maps.map(f => this.syncSourcemap(path.join(sourcemapsDir, f), appVersion, commitHash, appId, token)));
    });
  }

  async syncSourcemap(file: string, appVersion: string, commitHash: string, appId: string, token: string): Promise<void> {

    const req = this.env.client.make('POST', `/monitoring/${appId}/sourcemaps`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: path.basename(file),
        version: appVersion,
        commit: commitHash
      });

    try {
      this.env.log.info(`Syncing ${chalk.green(file)}`);
      const res = await this.env.client.do(req);

      if (res.meta.status !== 201) {
        throw createFatalAPIFormat(req, res);
      }

      return this.uploadSourcemap(res, file);
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 409) {
        this.env.log.error('Unable to sync map ${file}.');
        this.env.tasks.fail();
      } else {
        throw e;
      }
    }
  }

  async uploadSourcemap(res: APIResponseSuccess, file: string) {
    const r = <any>res;

    const fileData = await fsReadFile(file, { encoding: 'utf8' });
    const sourcemapPost = r.data.sourcemap_post;

    createRequest('post', sourcemapPost.url)
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
        this.env.log.info('See the Error Monitoring docs for usage information and next steps: http://ionicframework.com/docs/pro/error-monitoring.html');

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
    return build(this.env, [], { _: [], prod: isProd });
  }
}
