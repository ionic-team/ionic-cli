import * as path from 'path'
import { ReactProject } from '../';

describe('@ionic/cli', () => {

  describe('lib/project/ionic-angular', () => {

    describe('ReactProject', () => {

      let p: ReactProject;

      beforeEach(() => {
        p = new ReactProject({ context: 'app', configPath: '/path/to/proj/file' } as any, {} as any);
        jest.spyOn(p, 'config', 'get').mockImplementation(() => ({ get: () => undefined } as any));
      });

      it('should set directory attribute', async () => {
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

      describe('getSourceDir', () => {

        it('should default to src', async () => {
          const result = await p.getSourceDir();
          expect(result).toEqual(path.resolve('/path/to/proj/src'));
        });

      });

      describe('getIndexHtmlPath', () => {

        it('should default to public', async () => {
          const result = await p.getIndexHtmlPath();
          expect(result).toEqual(path.resolve('/path/to/proj/public/index.html'));
        });

      });

    });

  });
});
