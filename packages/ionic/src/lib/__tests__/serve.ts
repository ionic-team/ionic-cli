import { ServeRunner } from '../serve';

class MyServeRunner extends ServeRunner<never> {
  constructor(protected readonly e: any) {
    super();
  }

  async getCommandMetadata(): Promise<any> { }
  modifyOpenURL(): any { }
  async serveProject(): Promise<any> { }
}

describe('ionic', () => {

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
          project: undefined,
        };

        it('should provide defaults with no options', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [] });
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111 });
        });

        it('should respect --local flag', () => {
          const runner = new MyServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { _: [], local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
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
