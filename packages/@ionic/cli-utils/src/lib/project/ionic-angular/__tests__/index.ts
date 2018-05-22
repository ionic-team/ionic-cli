import { IonicAngularProject } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/ionic-angular', () => {

    describe('IonicAngularProject', () => {

      it('should set directory attribute', async () => {
        const p = new IonicAngularProject('/path/to/proj', 'file', {});
        expect(p.directory).toEqual('/path/to/proj');
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const p = new IonicAngularProject('/path/to/proj', 'file', {});
          const result = await p.getSourceDir();
          expect(result).toEqual('/path/to/proj/src');
        });

      });

    });

  });

});
