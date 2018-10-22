import * as path from 'path'
import { IonicAngularProject } from '../';

describe('ionic', () => {

  describe('lib/project/ionic-angular', () => {

    describe('IonicAngularProject', () => {

      it('should set directory attribute', async () => {
        const p = new IonicAngularProject('/path/to/proj/file', undefined, {} as any);
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const p = new IonicAngularProject('/path/to/proj/file', undefined, {} as any);
          const result = await p.getSourceDir();
          expect(result).toEqual(path.resolve('/path/to/proj/src'));
        });

      });

    });

  });

});
