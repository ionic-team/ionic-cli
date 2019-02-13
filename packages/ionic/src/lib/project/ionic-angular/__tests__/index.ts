import * as path from 'path'
import { IonicAngularProject } from '../';

describe('ionic', () => {

  describe('lib/project/ionic-angular', () => {

    describe('IonicAngularProject', () => {

      let p: IonicAngularProject;

      beforeEach(() => {
        p = new IonicAngularProject({ context: 'app', configPath: '/path/to/proj/file' } as any, {} as any);
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

    });

  });

});
