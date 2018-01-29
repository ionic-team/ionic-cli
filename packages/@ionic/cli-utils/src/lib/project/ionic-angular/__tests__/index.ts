import { Project } from '../';

describe('@ionic/cli-utils', () => {

  describe('lib/project/ionic-angular', () => {

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

      });

    });

  });

});
