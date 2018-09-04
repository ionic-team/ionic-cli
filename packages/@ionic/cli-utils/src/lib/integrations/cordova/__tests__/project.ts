import * as fsSpy from '@ionic/utils-fs';
import * as project from '../project';

describe('@ionic/cli-utils', () => {

  describe('lib/cordova/project', () => {

    describe('getPlatforms', () => {

      it('should filter out platforms.json and empty string', async () => {
        spyOn(fsSpy, 'readDir').and.callFake(async () => ['.DS_Store', 'android', 'ios', 'platforms.json', '']);
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual(['android', 'ios']);
      });

      it('should not error if directory empty', async () => {
        spyOn(fsSpy, 'readDir').and.callFake(async () => []);
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual([]);
      });

    });

  });

});
