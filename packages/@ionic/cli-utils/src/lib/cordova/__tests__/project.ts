import * as fsSpy from '@ionic/cli-framework/utils/fs';
import * as project from '../project';

describe('@ionic/cli-utils', () => {

  describe('lib/cordova/project', () => {

    describe('getPlatforms', () => {

      it('should filter out platforms.json and empty string', async () => {
        spyOn(fsSpy, 'fsReadDir').and.callFake(async () => ['android', 'ios', 'platforms.json', '']);
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual(['android', 'ios']);
      });

      it('should not error if directory does not exist', async () => {
        spyOn(fsSpy, 'fsReadDir').and.callFake(() => {
          const err = new Error();
          err.code = 'ENOENT';
          return Promise.reject(err);
        });
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual([]);
      });

    });

  });

});
