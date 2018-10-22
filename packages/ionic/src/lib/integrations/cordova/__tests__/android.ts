import * as android from '../android';

describe('ionic', () => {

  describe('lib/android', () => {

    describe('getAndroidSdkToolsVersion', () => {

      beforeEach(() => {
        jest.resetModules();
      });

      it('should return undefined for a missing source.properties file', async () => {
        jest.mock('@ionic/utils-fs', () => ({
          readFile: () => {
            const err: NodeJS.ErrnoException = new Error();
            err.code = 'ENOENT';
            return Promise.reject(err);
          },
        }));

        const android = require('../android');
        const result = await android.getAndroidSdkToolsVersion();
        expect(result).toEqual(undefined);
      });

    });

    describe('parseSDKVersion', () => {

      it('should parse sdk tools version from source.properties file', async () => {
        const contents = `
Pkg.UserSrc=false

Pkg.Revision=26.0.2
Platform.MinPlatformToolsRev=20
Pkg.Dependencies=emulator
Pkg.Path=tools
Pkg.Desc=Android SDK Tools
`;

        const result = await android.parseSDKVersion(contents);
        expect(result).toEqual('26.0.2');
      });

      it('should return undefined for a missing Pkg.Revision entry in source.properties file', async () => {
        const contents = `
some file in some garbage format
`;

        const result = await android.parseSDKVersion(contents);
        expect(result).toEqual(undefined);
      });

    });

  });

});
