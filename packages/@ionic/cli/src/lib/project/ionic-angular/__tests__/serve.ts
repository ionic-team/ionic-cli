import { IonicAngularServeRunner } from '../serve';

describe('@ionic/cli', () => {

  describe('lib/project/ionic-angular/serve', () => {

    describe('IonicAngularServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          '--': [],
          address: 'localhost',
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

        it('should provide defaults with no options', async () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = await runner.createOptionsFromCommandLine([], { _: [] });
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', async () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = await runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', async () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = await runner.createOptionsFromCommandLine([], { _: [], address: '0.0.0.0', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333', env: 'prod' });
          expect(result).toEqual({ ...defaults, address: '0.0.0.0', port: 1111, livereloadPort: 2222, notificationPort: 3333, env: 'prod' });
        });

        it('should respect --external flag', async () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = await runner.createOptionsFromCommandLine([], { _: [], external: true });
          expect(result).toEqual({ ...defaults, address: '0.0.0.0' });
        });

        it('should pass on separated args', async () => {
          const runner = new IonicAngularServeRunner({} as any);
          const result = await runner.createOptionsFromCommandLine([], { _: [], '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

  });

});
