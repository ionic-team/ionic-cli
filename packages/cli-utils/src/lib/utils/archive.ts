import * as archiverType from 'archiver';

import { load } from '../modules';

export function createArchive(format: 'zip' | 'tar'): archiverType.Archiver {
  const archiver = load('archiver');
  return archiver(format);
}
