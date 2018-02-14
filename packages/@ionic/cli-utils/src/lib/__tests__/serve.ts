import { ServeRunner } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('lib/serve', () => {

    describe('ServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          '--': [],
          address: '0.0.0.0',
          browser: undefined,
          browserOption: undefined,
          devapp: true,
          engine: 'browser',
          externalAddressRequired: false,
          lab: false,
          labHost: 'localhost',
          labPort: 8200,
          livereload: true,
          open: false,
          port: 8100,
          proxy: true,
          ssl: false,
        };

        it('should provide defaults with no options', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], {});
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111 });
        });

        it('should respect --local flag', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
        });

        it('should pass on separated args', () => {
          const runner = new ServeRunner();
          const result = runner.createOptionsFromCommandLine([], { '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

  });

});
