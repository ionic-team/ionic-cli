import * as path from 'path'
import { AngularProject } from '../';

describe('ionic', () => {

  describe('lib/project/angular', () => {

    describe('AngularProject', () => {

      it('should set directory attribute', async () => {
        const p = new AngularProject('/path/to/proj/file', undefined, {});
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const p = new AngularProject('/path/to/proj/file', undefined, {});
          const result = await p.getSourceDir();
          expect(result).toEqual(path.resolve('/path/to/proj/src'));
        });

      });

    });

  });

});
