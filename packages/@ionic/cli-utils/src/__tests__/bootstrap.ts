describe('@ionic/cli-utils', () => {

  describe('bootstrap', () => {

    describe('detectLocalCLI', () => {

      beforeEach(() => {
        jest.resetModules();
      });

      it('should detect local cli if installed in project', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve('/path/to/project'),
          pathAccessible: () => Promise.resolve(true),
        }));

        jest.mock('@ionic/cli-framework/utils/npm', () => ({
          readPackageJsonFile: () => Promise.resolve({ version: '3.999.0' }),
        }));

        const bootstrap = require('../bootstrap');
        const result = await bootstrap.detectLocalCLI();
        expect(result).toEqual('/path/to/project/node_modules/ionic');
      });

      it('should not detect local cli if installed and too old', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve('/path/to/project'),
          pathAccessible: () => Promise.resolve(true),
        }));

        jest.mock('@ionic/cli-framework/utils/npm', () => ({
          readPackageJsonFile: () => Promise.resolve({ version: '3.9.2' }),
        }));

        const bootstrap = require('../bootstrap');
        expect(bootstrap.detectLocalCLI()).rejects.toEqual('VERSION_TOO_OLD');
      });

      it('should not detect local cli when marker file not found', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve(undefined),
        }));

        const bootstrap = require('../bootstrap');
        expect(bootstrap.detectLocalCLI()).rejects.toEqual('BASE_DIRECTORY_NOT_FOUND');
      });

      it('should not detect local cli if not installed in project', async () => {
        jest.mock('@ionic/cli-framework/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve('/path/to/project'),
          pathAccessible: () => Promise.resolve(false),
        }));

        const bootstrap = require('../bootstrap');
        expect(bootstrap.detectLocalCLI()).rejects.toEqual('LOCAL_CLI_NOT_FOUND');
      });

    });

  });

});
