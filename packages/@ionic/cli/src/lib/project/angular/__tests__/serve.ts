import { CommandLineOptions } from '../../../../definitions';
import { AngularServeCLI, AngularServeRunner } from '../serve';

describe('@ionic/cli', () => {

  describe('lib/project/angular/serve', () => {

    describe('AngularServeRunner', () => {

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
          project: 'app',
          prod: undefined,
          platform: undefined,
          verbose: false,
        };

        it('should provide defaults with no options', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], {} as CommandLineOptions);
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should allow overrides of default values', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], host: '0.0.0.0', port: '1111' });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0', port: 1111 });
        });

        it('should respect --external flag', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], host: 'localhost', external: true });
          expect(result).toEqual({ ...defaults, host: '0.0.0.0' });
        });

        it('should respect --consolelogs flag', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], consolelogs: true });
          expect(result).toEqual({ ...defaults, consolelogs: true, consolelogsPort: 53703 });
        });

        it('should respect --project and --configuration flags', () => {
          const runner = new AngularServeRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], project: 'otherProject', configuration: 'production' });
          expect(result).toEqual({ ...defaults, project: 'otherProject', configuration: 'production' });
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
          const project = {};
          const cli = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            host: 'localhost',
            port: 4200,
            sourcemaps: true,
            ssl: true,
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual([
            `--host=${options.host}`,
            `--port=${options.port}`,
            `--source-map`,
            `--ssl`,
          ]);
        });

        it('should pass verbose flag', async () => {
          const project = {};
          const cli = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            verbose: true,
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual(['--verbose']);
        });

        it('should pass cordova options', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const cli = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual([
            `--platform=${options.platform}`,
            `--cordova-base-path=${root}`,
          ]);
        });

        it('should pass separated options', async () => {
          const project = {};
          const cli = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            '--': ['--extra=true'],
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual(['--extra=true']);
        });

        it('should not pass separated options for cordova', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const cli = new AngularServeCLI({ project } as any);
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
            '--': ['--extra=true'],
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).not.toEqual(expect.arrayContaining(['--extra=true']));
        });

        it('should pass configuration and project for custom program', async () => {
          const project = {};
          const cli = new AngularServeCLI({ project } as any);
          (cli as any)._resolvedProgram = 'npm';
          const options = {
            ...defaults,
            configuration: 'production',
            project: 'otherProject',
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual(['--configuration=production', '--project=otherProject']);
        });

        it('should not pass configuration and project for custom program if they are the defaults', async () => {
          const project = {};
          const cli = new AngularServeCLI({ project } as any);
          (cli as any)._resolvedProgram = 'npm';
          const options = {
            ...defaults,
          };

          const result = await (cli as any).serveOptionsToNgArgs(options);
          expect(result).toEqual([]);
        });

      });

    });

  });

});
