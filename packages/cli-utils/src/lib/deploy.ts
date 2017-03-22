import * as archiver from 'archiver';
import * as superagent from 'superagent';

import { DeploySnapshotRequest, IClient } from '../definitions';
import { isDeploySnapshotRequestResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export class DeployClient {
  constructor(protected client: IClient) {}

  async requestSnapshotUpload(appUserToken: string): Promise<DeploySnapshotRequest> {
    const req = this.client.make('POST', '/deploy/snapshots')
      .set('Authorization', `Bearer ${appUserToken}`)
      .send({});

    const res = await this.client.do(req);

    if (!isDeploySnapshotRequestResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  uploadSnapshot(snapshot: DeploySnapshotRequest, zip: NodeJS.ReadableStream, progress?: (loaded: number, total: number) => void): Promise<void> {
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
          if (progress) {
            progress(event.loaded, event.total);
          }
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

export function createZipStream(wwwPath: string): NodeJS.ReadableStream {
  const archive = archiver('zip');

  archive.directory(wwwPath, 'www');
  archive.finalize();

  return archive;
}
