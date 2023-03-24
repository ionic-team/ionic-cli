import fsExtraSpy from 'fs-extra';
import * as fsSafeSpy from '@ionic/utils-fs/dist/safe';
import * as project from '../project';

describe('@ionic/cli', () => {

  describe('lib/cordova/project', () => {

    describe('getPlatforms', () => {

      it('should filter out files and hidden files/folders', async () => {
        const files: [string, boolean][] = [['.DS_Store', false], ['.dir', true], ['android', true], ['ios', true], ['platforms.json', false]];
        jest.spyOn(fsSafeSpy, 'readdir').mockImplementation(async () => files.map(([f]) => f));
        jest.spyOn(fsSafeSpy, 'stat').mockImplementation(async (p: any) => ({
          isDirectory: () => {
            const file = files.find(([f]) => p.endsWith(f));
            return typeof file !== 'undefined' && file[1];
          },
        } as any));

        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual(['android', 'ios']);
      });

      it('should not error if directory empty', async () => {
        jest.spyOn(fsSafeSpy, 'readdir').mockImplementation(async () => []);
        const platforms = await project.getPlatforms('/path/to/proj');
        expect(platforms).toEqual([]);
      });

    });

    describe('getAndroidBuildOutputJson', () => {

      it('should throw for fs error', () => {
        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => { throw new Error('error') });

        const p = project.getAndroidBuildOutputJson(['/path/to/output.json']);
        expect(p).rejects.toThrowError('Could not find or parse valid build output file');
      });

      it('should throw for unrecognized format', () => {
        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => ({ foo: 'bar' }));

        const p = project.getAndroidBuildOutputJson(['/path/to/output.json']);
        expect(p).rejects.toThrowError('Could not find or parse valid build output file');
      });

      it('should parse legacy output.json', () => {
        const file = [
          {
            outputType: {
              type: 'APK',
            },
            path: 'app-debug.apk',
          },
        ];

        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => file);

        const p = project.getAndroidBuildOutputJson(['/path/to/output.json']);
        expect(p).resolves.toEqual(file);
      });

      it('should parse output.json', () => {
        const file = {
          artifactType: {
            type: 'APK',
          },
          elements: [
            {
              outputFile: 'app-debug.apk',
            }
          ],
        };

        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => file);

        const p = project.getAndroidBuildOutputJson(['/path/to/output.json']);
        expect(p).resolves.toEqual(file);
      });

    });

    describe('getAndroidPackageFilePath', () => {

      it('should get file path from legacy output.json', () => {
        const file = [
          {
            outputType: {
              type: 'APK',
            },
            path: 'foo-debug.apk',
          },
        ];

        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => file);

        const p = project.getAndroidPackageFilePath('/path/to/proj', { release: false });
        expect(p).resolves.toEqual('platforms/android/app/build/outputs/apk/debug/foo-debug.apk');
      });

      it('should get file path from output.json', () => {
        const file = {
          artifactType: {
            type: 'APK',
          },
          elements: [
            {
              outputFile: 'bar-debug.apk',
            }
          ],
        };

        jest.spyOn(fsExtraSpy, 'readJson').mockImplementation(async () => file);

        const p = project.getAndroidPackageFilePath('/path/to/proj', { release: false });
        expect(p).resolves.toEqual('platforms/android/app/build/outputs/apk/debug/bar-debug.apk');
      });

    });

  });

});
