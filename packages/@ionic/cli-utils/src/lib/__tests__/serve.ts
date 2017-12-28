import { ServeRunner } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('lib/serve', () => {

    describe('ServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          address: '0.0.0.0',
          port: 8100,
          livereloadPort: 35729,
          notificationPort: 53703,
          consolelogs: false,
          serverlogs: false,
          livereload: true,
          proxy: true,
          lab: false,
          open: false,
          devapp: true,
          externalAddressRequired: false,
          platform: undefined,
          target: undefined,
        };

        it('should provide defaults with no options', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], {});
          expect(result).toEqual(defaults);
        });

        it('should bring in platform from inputs', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine(['android'], { target: 'cordova' });
          expect(result).toEqual({ ...defaults, platform: 'android', target: 'cordova', devapp: false });
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111, livereloadPort: 2222, notificationPort: 3333 });
        });

        it('should respect --local flag', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
        });

      });

    });

  });

});
