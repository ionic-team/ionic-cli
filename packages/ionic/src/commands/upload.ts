import * as path from 'path';

import * as archiver from 'archiver';
import * as chalk from 'chalk';
import * as superagent from 'superagent';

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

@CommandMetadata({
  name: 'upload',
  description: 'Upload a new snapshot of your app',
  exampleCommands: [''],
  options: [
    {
      name: 'note',
      description: 'Give this snapshot a nice description',
    },
    {
      name: 'deploy',
      description: 'Deploys this snapshot to the given channel',
      default: 'dev',
    },
  ],
  requiresProject: true
})
export class UploadCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const token = await this.env.session.getAppUserToken();
    const zip = this.createZipStream();

    const tasks = new TaskChain();

    tasks.next('Requesting snapshot');
    const snapshot = await this.requestSnapshotUpload(token);
    const uploadTask = tasks.next('Uploading snapshot');
    await this.uploadSnapshot(snapshot, zip, (loaded, total) => {
      uploadTask.progress(loaded, total);
    });

    tasks.end();

    this.env.log.ok(`Uploaded snapshot ${chalk.bold(snapshot.uuid)}!`);
  }

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

  private uploadSnapshot(snapshot: Snapshot, zip: NodeJS.ReadableStream, progress: (loaded: number, total: number) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      zip.on('error', (err: any) => {
        reject(err);
      });

      let bufs: Buffer[] = [];

      zip.on('data', (buf: Buffer) => {
        bufs.push(buf);
      });

      zip.on('end', () => {
        superagent.post(snapshot.presigned_post.url)
          .field(snapshot.presigned_post.fields)
          .field('file', Buffer.concat(bufs))
          .on('progress', (event) => {
            progress(event.loaded, event.total);
          })
          .end((err, res) => {
            if (err) {
              return reject(err);
            }
            if (res.status !== 204) {
              // TODO: log body for debug purposes?
              return reject(new Error(`Unexpected status code from AWS: ${res.status}`));
            }
            resolve();
          });
      });
    });
  }
}
