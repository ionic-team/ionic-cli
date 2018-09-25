describe('ionic', () => {

  describe('bootstrap', () => {

    describe('detectLocalCLI', () => {

      beforeEach(() => {
        jest.resetModules();
      });

      it('should detect local cli if installed in project', async () => {
        jest.mock('@ionic/cli-framework/utils/node', () => ({
          resolve: () => '/path/to/project/node_modules/ionic/package.json',
          compileNodeModulesPaths: () => [],
          readPackageJsonFile: () => Promise.resolve({ version: '4.999.0' }),
        }));

        const bootstrap = require('../bootstrap');
        const result = await bootstrap.detectLocalCLI();
        expect(result).toEqual('/path/to/project/node_modules/ionic');
      });

      it('should not detect local cli if installed and too old', async () => {
        jest.mock('@ionic/cli-framework/utils/node', () => ({
          resolve: () => '/path/to/project/node_modules/ionic/package.json',
          compileNodeModulesPaths: () => [],
          readPackageJsonFile: () => Promise.resolve({ version: '3.9.2' }),
        }));

        const bootstrap = require('../bootstrap');
        await expect(bootstrap.detectLocalCLI()).rejects.toEqual('VERSION_TOO_OLD');
      });

      it('should not detect local cli if not installed in project', async () => {
        jest.mock('@ionic/cli-framework/utils/node', () => ({
          resolve: () => { throw new Error('Module not found') },
          compileNodeModulesPaths: () => [],
        }));

        const bootstrap = require('../bootstrap');
        await expect(bootstrap.detectLocalCLI()).rejects.toEqual('LOCAL_CLI_NOT_FOUND');
      });

    });

  });

});
