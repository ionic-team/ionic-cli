import * as fs from 'fs';
import * as path from 'path';

import * as archiver from 'archiver';
import * as chalk from 'chalk';
import * as superagent from 'superagent';
import * as FormData from 'form-data';

import {
  APIResponse,
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  createFatalAPIFormat,
  isAPIResponseSuccess,
  promisify,
} from '@ionic/cli-utils';

interface Snapshot {
  uuid: string;
  presigned_post: {
    url: string;
    fields: Object;
  };
}

interface SnapshotResponse extends APIResponseSuccess {
  data: Snapshot;
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
  private createZipStream(): NodeJS.ReadableStream {
    const archive = archiver('zip');

    archive.directory(path.join(this.env.project.directory, 'www'), 'www'); // TODO don't hardcode

    // archive.glob(path.join(this.env.project.directory, '**', '*'));

    archive.finalize();

    return archive;
  }

  private async requestSnapshotUpload(token: string): Promise<Snapshot> {
    const req = this.env.client.make('POST', '/deploy/snapshots')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const res = await this.env.client.do(req);

    if (!isSnapshotResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  private uploadSnapshot(snapshot: Snapshot, zip: NodeJS.ReadableStream): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const form = new FormData();

      zip.on('error', (err: any) => {
        reject(err);
      });

      // TODO: how do people do this elegantly nowadays?
      const fields = <any>snapshot.presigned_post.fields;
      for (let k in snapshot.presigned_post.fields) {
        form.append(k, fields[k]);
      }

      let bufs: Buffer[] = [];

      zip.on('data', (buf: Buffer) => {
        bufs.push(buf);
      });

      zip.on('end', () => {
        form.append('file', Buffer.concat(bufs));

        form.submit(snapshot.presigned_post.url, (err, res) => {
          if (err) {
            return reject(err);
          }

          let body = '';

          res.on('data', (chunk: string) => {
            body += chunk;
          });

          res.on('end', () => {
            if (res.statusCode !== 204) {
              // TODO: log body for debug purposes?
              return reject(new Error(`Unexpected status code from AWS: ${res.statusCode}`));
            }

            resolve();
          });

          res.resume();
        });
      });
    });
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const token = await this.env.session.getAppUserToken();
    const zip = this.createZipStream();

    const tasks = new TaskChain();

    tasks.next('Requesting snapshot');
    const snapshot = await this.requestSnapshotUpload(token);
    tasks.next('Uploading snapshot'); // TODO: progress bar?
    await this.uploadSnapshot(snapshot, zip);

    tasks.end();

    this.env.log.ok(`Uploaded snapshot ${chalk.bold(snapshot.uuid)}!`);
  }
}
