import { Project } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/ionic1', () => {

    describe('Project', () => {

      it('should set directory attribute', async () => {
        const p = new Project('/path/to/proj', 'file', {});
        expect(p.directory).toEqual('/path/to/proj');
      });

      describe('getSourceDir', () => {

        it('should use documentRoot, if set', async () => {
          const p = new Project('/path/to/proj', 'file', {});
          spyOn(p, 'load').and.callFake(() => Promise.resolve({ documentRoot: 'some/dir' }));
          expect(await p.getSourceDir()).toEqual('/path/to/proj/some/dir');
        });

        it('should default to www', async () => {
          const p = new Project('/path/to/proj', 'file', {});
          const result = await p.getSourceDir();
          expect(result).toEqual('/path/to/proj/www');
        });

      });

    });

  });

});
