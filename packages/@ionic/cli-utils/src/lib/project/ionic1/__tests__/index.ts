import * as path from 'path'
import { Ionic1Project } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/ionic1', () => {

    describe('Ionic1Project', () => {

      it('should set directory attribute', async () => {
        const p = new Ionic1Project('/path/to/proj', 'file', {});
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

      describe('getSourceDir', () => {

        it('should use documentRoot, if set', async () => {
          const p = new Ionic1Project('/path/to/proj', 'file', {});
          spyOn(p, 'load').and.callFake(() => Promise.resolve({ documentRoot: 'some/dir' }));
          expect(await p.getSourceDir()).toEqual(path.resolve('/path/to/proj/some/dir'));
        });

        it('should default to www', async () => {
          const p = new Ionic1Project('/path/to/proj', 'file', {});
          const result = await p.getSourceDir();
          expect(result).toEqual(path.resolve('/path/to/proj/www'));
        });

      });

    });

  });

});
