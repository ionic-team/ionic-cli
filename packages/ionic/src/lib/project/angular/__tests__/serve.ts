import { AngularServeRunner, AngularServeCLI } from '../serve';
import { CommandLineOptions } from '../../../../definitions';

describe('ionic', () => {

  describe('lib/project/angular/serve', () => {

    describe('AngularServeRunner', () => {

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
          project: undefined,
          prod: undefined,
          platform: undefined,
        };

        it('should provide defaults with no options', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], {} as CommandLineOptions);
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should turn off devapp for cordova', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], engine: 'cordova' });
          expect(result).toEqual({ ...defaults, devapp: false, engine: 'cordova' });
        });

        it('should allow overrides of default values', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], address: 'localhost', port: '1111' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111 });
        });

        it('should respect --local flag', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
        });

        it('should respect --project and --configuration flags', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], project: 'app', configuration: 'production' });
          expect(result).toEqual({ ...defaults, project: 'app', configuration: 'production' });
        });

        it('should pass on separated args', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

    describe('AngularServeCLI', () => {

      describe('serveOptionsToNgArgs', () => {

        const defaults = {
          '--': [],
        };

        it('should pass options', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const runner = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            sourcemaps: true,
            ssl: true,
          };

          const result = await (runner as any).serveOptionsToNgArgs(options);
          expect(result).toEqual(expect.arrayContaining([
            `--ssl`,
            `--source-map`,
          ]));
        });

        it('should pass cordova options', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const runner = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
          };

          const result = await (runner as any).serveOptionsToNgArgs(options);
          expect(result).toEqual(expect.arrayContaining([
            `--platform=${options.platform}`,
            `--cordova-base-path=${root}`,
          ]));
        });

      });

    });

  });

});
