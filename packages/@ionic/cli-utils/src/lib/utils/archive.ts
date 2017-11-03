import * as archiver from 'archiver';
import * as tarType from 'tar';

import { IonicEnvironment } from '../../definitions';

import { createRequest } from '../http';

export type TarExtractOptions = tarType.ExtractOptions & tarType.FileOptions;
export type TarDownloadOptions = { progress?: (loaded: number, total: number) => void; };
export type TarExtractDownloadOptions = TarExtractOptions & TarDownloadOptions;

export function createArchive(format: 'zip' | 'tar'): archiver.Archiver {
  return archiver(format);
}

export async function tarXvfFromUrl(env: IonicEnvironment, url: string, destination: string, opts?: TarExtractDownloadOptions): Promise<void> {
  const { req } = await createRequest(env.config, 'get', url);

  const progressFn = opts ? opts.progress : undefined;

  return new Promise<void>((resolve, reject) => {
    req
      .on('response', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(
            `Encountered bad status code (${res.statusCode}) for ${url}\n` +
            `This could mean the server is experiencing difficulties right now--please try again later.`
          ));
        }

        if (progressFn) {
          let loaded = 0;
          const total = Number(res.headers['content-length']);
          res.on('data', (chunk) => {
            loaded += chunk.length;
            progressFn(loaded, total);
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

    tarXvf(req, destination, opts).then(resolve, reject);
  });
}

async function tarXvf(readStream: NodeJS.ReadableStream, destination: string, opts?: TarExtractOptions) {
  const tar = await import('tar');

  const tarOpts = { cwd: destination, ...opts };

  return new Promise<void>((resolve, reject) => {
    const ws = tar.extract(tarOpts)
      .on('error', reject)
      .on('end', resolve);

    readStream
      .on('error', reject)
      .pipe(ws);
  });
}
