import { IonicAngularServeRunner } from '../serve';

describe('@ionic/cli', () => {

  describe('lib/project/ionic-angular/serve', () => {

    describe('IonicAngularServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          '--': [],
          publicHost: undefined,
          host: 'localhost',
          browser: undefined,
          browserOption: undefined,
          consolelogs: false,
          engine: 'browser',
          env: undefined,
          externalAddressRequired: false,
          lab: false,
          labHost: 'localhost',
          labPort: 8200,
          livereload: true,
          livereloadPort: 35729,
          notificationPort: 53703,
          open: false,
          port: 8100,
          proxy: true,
          serverlogs: false,
          project: undefined,
          verbose: false,
        };

        it('should provide defaults with no options', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [] });
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], host: '0.0.0.0', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333', env: 'prod' });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0', port: 1111, livereloadPort: 2222, notificationPort: 3333, env: 'prod' });
        });

        it('should respect --external flag', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], host: 'localhost', external: true });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0' });
        });

        it('should pass on separated args', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

  });

});
