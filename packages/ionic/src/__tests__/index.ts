import * as path from 'path';

import * as semver from 'semver';
import * as lodash from 'lodash';

import { generateContext } from '../';

describe('ionic', () => {

  describe('index', () => {

    describe('generateContext', () => {

      it('should match expected structure', async () => {
        const meta = await generateContext();
        expect(path.isAbsolute(meta.binPath)).toBe(true);
        expect(path.isAbsolute(meta.libPath)).toBe(true);
        expect(meta.execPath).toBe(process.cwd());
        expect(semver.valid(meta.version)).toEqual(meta.version);
      });

      it('should have expected path for bin script', async () => {
        const { binPath } = await generateContext();
        const pathParts = lodash.takeRight(binPath.split(path.sep), 2);
        expect(pathParts).toEqual(['bin', 'ionic']);
      });

    });

  });

});
