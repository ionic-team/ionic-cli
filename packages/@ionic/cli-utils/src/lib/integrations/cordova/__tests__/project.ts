import * as fsSpy from '@ionic/cli-framework/utils/fs';
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

    describe('installPlatform', () => {

      const mockRun = jest.fn();
      const mockRunWithError = jest.fn(() => {
        throw new Error('Platform fakePlatform already added');
      });
      const env = jest.fn(run => {
        return {
          shell: { run },
          log: {
            warn: jest.fn(),
          },
        };
      });

      it('should run the process in the cwd', async () => {
        await project.installPlatform(new env(mockRun), 'fakePlatform', 'fakeCwd');
        try {
          await project.installPlatform(new env(mockRunWithError), 'fakePlatform', 'fakeCwd');
        } catch (e) {
          // ignore
        }
        expect(mockRun.mock.calls[0][2]).toEqual(jasmine.objectContaining({
          cwd: 'fakeCwd',
        }));
        expect(mockRunWithError.mock.calls[1][2]).toEqual(jasmine.objectContaining({
          cwd: 'fakeCwd',
        }));
      });

    });

  });

});
