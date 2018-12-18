import * as fsSpy from '@ionic/utils-fs';
import * as project from '../project';

describe('ionic', () => {

  describe('lib/cordova/project', () => {

    describe('getPlatforms', () => {

      it('should filter out files and hidden files/folders', async () => {
        const files = [['.DS_Store', false], ['.dir', true], ['android', true], ['ios', true], ['platforms.json', false]];
        spyOn(fsSpy, 'readDirSafe').and.callFake(async () => files.map(([f]) => f));
        spyOn(fsSpy, 'statSafe').and.callFake(async (p) => ({
          isDirectory: () => {
            const file = files.find(([f]) => p.endsWith(f));
            return typeof file !== 'undefined' && file[1];
          },
        }));

        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual(['android', 'ios']);
      });

      it('should not error if directory empty', async () => {
        spyOn(fsSpy, 'readDirSafe').and.callFake(async () => []);
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual([]);
      });

    });

  });

});
