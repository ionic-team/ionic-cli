import { ServeRunner } from '../serve';

class MyServeRunner extends ServeRunner<never> {
  constructor(protected readonly e: any) {
    super();
  }

  async getCommandMetadata(): Promise<any> { }
  modifyOpenUrl(): any { }
  async serveProject(): Promise<any> { }
}

describe('@ionic/cli', () => {

  describe('lib/serve', () => {

    describe('ServeRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          '--': [],
          publicHost: undefined,
          host: 'localhost',
          browser: undefined,
          browserOption: undefined,
          engine: 'browser',
          externalAddressRequired: false,
          lab: false,
          labHost: 'localhost',
          labPort: 8200,
          livereload: true,
          open: false,
          port: 8100,
          proxy: true,
          project: undefined,
          verbose: false,
        };

        it('should provide defaults with no options', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [] });
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], host: '0.0.0.0', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0', port: 1111 });
        });

        it('should respect --external flag', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], host: 'localhost', external: true });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0' });
        });

        it('should respect --project flag', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], project: 'app' });
          expect(result).toEqual({ ...defaults, project: 'app' });
        });

        it('should pass on separated args', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

  });

});
