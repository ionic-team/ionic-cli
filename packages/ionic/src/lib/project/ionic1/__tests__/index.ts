import * as path from 'path'
import { Ionic1Project } from '../';

describe('ionic', () => {

  describe('lib/project/ionic1', () => {

    describe('Ionic1Project', () => {

      let p: Ionic1Project;

      beforeEach(() => {
        p = new Ionic1Project({ context: 'app', configPath: '/path/to/proj/file' } as any, {} as any);
        jest.spyOn(p, 'config', 'get').mockImplementation(() => ({ get: () => undefined }));
      });

      it('should set directory attribute', async () => {
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

    });

  });

});
