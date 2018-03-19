import * as path from 'path';

import * as semver from 'semver';
import * as lodash from 'lodash';

import { loadMeta } from '../';

describe('ionic', () => {

  describe('index', () => {

    describe('loadMeta', () => {

      it('should match expected structure', async () => {
        const meta = await loadMeta();
        expect(path.isAbsolute(meta.binPath)).toBe(true);
        expect(path.isAbsolute(meta.libPath)).toBe(true);
        expect(semver.valid(meta.version)).toEqual(meta.version);
      });

      it('should have expected path for bin script', async () => {
        const { binPath } = await loadMeta();
        const pathParts = lodash.takeRight(binPath.split(path.sep), 2);
        expect(pathParts).toEqual(['bin', 'ionic']);
      });

      it('should have expected path for main script', async () => {
        const { libPath } = await loadMeta();
        const pathParts = lodash.takeRight(libPath.split(path.sep), 2);
        expect(pathParts).toEqual(['dist', 'index.js']);
      });

    });

  });

});
