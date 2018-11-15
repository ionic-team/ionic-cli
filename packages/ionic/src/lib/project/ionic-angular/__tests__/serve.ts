import { IonicAngularServeRunner } from '../serve';

describe('ionic', () => {

  describe('lib/project/ionic-angular/serve', () => {

    describe('IonicAngularServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          '--': [],
          address: '0.0.0.0',
          browser: undefined,
          browserOption: undefined,
          consolelogs: false,
          devapp: true,
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
          project: undefined
        };

        it('should provide defaults with no options', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [] });
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should turn off devapp for cordova', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], engine: 'cordova' });
          expect(result).toEqual({ ...defaults, devapp: false, engine: 'cordova' });
        });

        it('should allow overrides of default values', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333', env: 'prod' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111, livereloadPort: 2222, notificationPort: 3333, env: 'prod' });
        });

        it('should respect --local flag', () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
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
