import * as path from 'path'
import { IonicAngularProject } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/ionic-angular', () => {

    describe('IonicAngularProject', () => {

      it('should set directory attribute', async () => {
        const p = new IonicAngularProject('/path/to/proj', 'file', undefined, {});
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const p = new IonicAngularProject('/path/to/proj', 'file', undefined, {});
          const result = await p.getSourceDir();
          expect(result).toEqual(path.resolve('/path/to/proj/src'));
        });

      });

    });

  });

});
