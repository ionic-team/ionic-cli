import * as path from 'path'
import { Ionic1Project } from '../';

describe('ionic', () => {

  describe('lib/project/ionic1', () => {

    describe('Ionic1Project', () => {

      it('should set directory attribute', async () => {
        const p = new Ionic1Project('/path/to/proj/file', undefined, {});
        expect(p.directory).toEqual(path.resolve('/path/to/proj'));
      });

    });

  });

});
