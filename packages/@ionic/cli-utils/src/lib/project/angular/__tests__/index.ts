import { Project } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/angular', () => {

    describe('Project', () => {

      it('should set directory attribute', async () => {
        const p = new Project('/path/to/proj', 'file', {});
        expect(p.directory).toEqual('/path/to/proj');
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const p = new Project('/path/to/proj', 'file', {});
          const result = await p.getSourceDir();
          expect(result).toEqual('/path/to/proj/src');
        });

        it('should should set the src relative to the project root', async () => {
          const p = new Project('/path/to/proj', 'file', {});
          const result = await p.getSourceDir('relative/path');
          expect(result).toEqual('/path/to/proj/relative/path/src');
        });

      });

    });

  });

});
