import * as archiver from 'archiver';

import { IonicEnvironment } from '../../definitions';

import { createRequest } from '../http';

export function createArchive(format: 'zip' | 'tar'): archiver.Archiver {
  return archiver(format);
}

export async function tarXvfFromUrl(env: IonicEnvironment, url: string, destination: string, { progress }: { progress?: (loaded: number, total: number) => void }): Promise<void> {
  const { req } = await createRequest(env.config, 'get', url);

  return new Promise<void>((resolve, reject) => {
    req
      .on('response', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Encountered bad status code (${res.statusCode}) for ${url}\n` +
                           `This could mean the server is experiencing difficulties right now--please try again later.\n\n` +
                           `If you're behind a firewall, you can proxy requests by using the HTTP_PROXY or IONIC_HTTP_PROXY environment variables.`));
        }

        if (progress) {
          let loaded = 0;
          const total = Number(res.headers['content-length']);
          res.on('data', (chunk) => {
            loaded += chunk.length;
            progress(loaded, total);
          });
        }
      })
      .on('error', (err) => {
        if (err.code === 'ECONNABORTED') {
          reject(new Error(`Timeout of ${err.timeout}ms reached for ${url}`));
        } else {
          reject(err);
        }
      });

    tarXvf(req, destination).then(resolve, reject);
  });
}

async function tarXvf(readStream: NodeJS.ReadableStream, destination: string) {
  const [ zlib, tar ] = await Promise.all([import('zlib'), import('tar')]);

  return new Promise<void>((resolve, reject) => {
    const baseArchiveExtract = tar.Extract({
        path: destination,
        strip: 1
      })
      .on('error', reject)
      .on('end', resolve);
    try {
      readStream
        .on('error', reject)
        .pipe(zlib.createUnzip())
        .pipe(baseArchiveExtract);
    } catch (e) {
      reject(e);
    }
  });
}
