import * as archiverType from 'archiver';
import * as tarType from 'tar';

export type TarExtractOptions = tarType.ExtractOptions & tarType.FileOptions;

export async function createArchive(format: 'zip' | 'tar'): Promise<archiverType.Archiver> {
  const archiver = await import('archiver');
  return archiver(format);
}

export async function createTarExtraction(opts?: TarExtractOptions): Promise<NodeJS.WritableStream> {
  const tar = await import('tar');
  return tar.extract(opts || {});
}
