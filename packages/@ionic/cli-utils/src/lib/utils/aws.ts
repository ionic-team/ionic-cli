import { IConfig } from '../../definitions';

import { createRequest } from '../http';

export async function s3SignedUpload(
  config: IConfig,
  presignedPostParams: { url: string, fields: Object },
  zip: NodeJS.ReadableStream,
  { progress }: { progress?: (loaded: number, total: number) => void }
): Promise<void> {
  const { req } = await createRequest(config, 'post', presignedPostParams.url);

  return new Promise<void>((resolve, reject) => {
    zip.on('error', (err: any) => {
      reject(err);
    });

    let bufs: Buffer[] = [];

    zip.on('data', (buf: Buffer) => {
      bufs.push(buf);
    });

    zip.on('end', () => {
      req
        .buffer()
        .field(presignedPostParams.fields)
        .field('file', Buffer.concat(bufs))
        .on('progress', event => {
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
