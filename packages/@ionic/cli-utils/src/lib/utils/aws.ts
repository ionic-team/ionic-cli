import { createRequest } from './http';

export function s3SignedUpload(
  presignedPostParams: { url: string, fields: Object },
  zip: NodeJS.ReadableStream,
  { progress }: {  progress?: (loaded: number, total: number) => void }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    zip.on('error', (err: any) => {
      reject(err);
    });

    let bufs: Buffer[] = [];

    zip.on('data', (buf: Buffer) => {
      bufs.push(buf);
    });

    zip.on('end', () => {
      createRequest('post', presignedPostParams.url)
        .buffer()
        .field(presignedPostParams.fields)
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
