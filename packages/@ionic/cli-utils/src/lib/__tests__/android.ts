describe('@ionic/cli-utils', () => {

  describe('lib/android', () => {

    describe('getAndroidSdkToolsVersion', () => {

      beforeEach(() => {
        jest.resetModules();
      });

      // it('should parse sdk tools version from source.properties file', async () => {
      //   jest.mock('../utils/fs', () => ({
      //     fsReadFile: () => Promise.resolve(`
// Pkg.UserSrc=false

// Pkg.Revision=26.0.2
// Platform.MinPlatformToolsRev=20
// Pkg.Dependencies=emulator
// Pkg.Path=tools
// Pkg.Desc=Android SDK Tools
// `),
      //   }));

      //   const android = require('../android');
      //   const result = await android.getAndroidSdkToolsVersion();
      //   expect(result).toEqual('26.0.2');
      // });

      it('should return undefined for a missing source.properties file', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          fsReadFile: () => {
            const err = new Error();
            err.code = 'ENOENT';
            return Promise.reject(err);
          },
        }));

        const android = require('../android');
        const result = await android.getAndroidSdkToolsVersion();
        expect(result).toEqual(undefined);
      });

      it('should return undefined for a missing Pkg.Revision entry in source.properties file', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          fsReadFile: () => Promise.resolve(`
some file in some garbage format
`),
        }));

        const android = require('../android');
        const result = await android.getAndroidSdkToolsVersion();
        expect(result).toEqual(undefined);
      });

    });

  });

});
