describe('@ionic/cli-utils', () => {

  describe('bootstrap', () => {

    describe('detectLocalCLI', () => {

      beforeEach(() => {
        jest.resetModules();
      });

      it('should detect local cli if installed in project', async () => {
        jest.mock('../lib/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve('/path/to/project'),
          pathAccessible: () => Promise.resolve(true),
        }));

        const bootstrap = require('../bootstrap');
        const result = await bootstrap.detectLocalCLI();
        expect(result).toEqual('/path/to/project/node_modules/ionic');
      });

      it('should not detect local cli when marker file not found', async () => {
        jest.mock('../lib/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve(undefined),
        }));

        const bootstrap = require('../bootstrap');
        const result = await bootstrap.detectLocalCLI();
        expect(result).toEqual(undefined);
      });

      it('should not detect local cli if not installed in project', async () => {
        jest.mock('../lib/utils/fs', () => ({
          findBaseDirectory: () => Promise.resolve('/path/to/project'),
          pathAccessible: () => Promise.resolve(false),
        }));

        const bootstrap = require('../bootstrap');
        const result = await bootstrap.detectLocalCLI();
        expect(result).toEqual(undefined);
      });

    });

  });

});
