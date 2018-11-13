import * as path from 'path'
import { AngularProject } from '../';

describe('ionic', () => {

  describe('lib/project/angular', () => {

    describe('AngularProject', () => {

      let p: AngularProject;

      beforeEach(() => {
        p = new AngularProject({ context: 'app', configPath: '/path/to/proj/file' } as any, {} as any);
        jest.spyOn(p, 'config', 'get').mockImplementation(() => ({ get: () => undefined }));
      });

      it('should set directory attribute', async () => {
        debugger;
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
