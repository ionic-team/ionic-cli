import * as fs from 'fs';
import * as path from 'path';

import * as superagent from 'superagent';
import * as chalk from 'chalk';
import * as archiver from 'archiver';

import {
  APIResponse,
  APIResponseSuccess,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  createFatalAPIFormat,
  isAPIResponseSuccess
} from '@ionic/cli-utils';

interface SnapshotResponse extends APIResponseSuccess {
  data: {
    uuid: string;
    presigned_post: {
      url: string;
      fields: Object;
    };
  }
}

function isSnapshotResponse(r: APIResponse): r is SnapshotResponse {
  let res: SnapshotResponse = <SnapshotResponse>r;
  return isAPIResponseSuccess(res)
    && typeof res.data.uuid === 'string'
    && typeof res.data.presigned_post === 'object'
    && typeof res.data.presigned_post.url === 'string'
    && res.data.presigned_post.fields && typeof res.data.presigned_post.fields === 'object';
}

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'upload',
  description: 'Upload a new snapshot of your app',
  exampleCommands: [''],
})
export class UploadCommand extends Command {
  createZipStream(): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { store: true });

      archive.on('error', (err) => {
        console.log('archive error');
        reject(err);
      });

      archive.directory(path.join(this.env.project.directory, 'www')); // TODO don't hardcode

      // archive.glob(path.join(this.env.project.directory, '**', '*'));

      archive.finalize();

      resolve(archive);
    });
  }

  uploadSnapshot(zip: NodeJS.ReadableStream, token: string): Promise<APIResponseSuccess> {
    return new Promise((resolve, reject) => {
      const req = this.env.client.make('POST', '/deploy/snapshots')
        .set('Authorization', `Bearer ${token}`);

      req.on('error', (err) => {
        console.log('req error');
        reject(err);
      });

      req.on('end', (r) => {
        console.log('req end');
        resolve(r);
      });

      zip.pipe(req);

      this.env.client.do(req);
    });
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const token = await this.env.session.getAppUserToken();
    const zip = await this.createZipStream();
    const res = await this.uploadSnapshot(zip, token);

    console.log(res);

    // console.log(token);
    this.env.log.ok(`Hi!`);
  }
}
