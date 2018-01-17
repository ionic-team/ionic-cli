import { ServeRunner } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('lib/serve', () => {

    describe('ServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          address: '0.0.0.0',
          browser: undefined,
          browserOption: undefined,
          consolelogs: false,
          devapp: true,
          env: undefined,
          externalAddressRequired: false,
          lab: false,
          labHost: 'localhost',
          labPort: 8200,
          livereload: true,
          livereloadPort: 35729,
          notificationPort: 53703,
          open: false,
          platform: undefined,
          port: 8100,
          proxy: true,
          serverlogs: false,
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
