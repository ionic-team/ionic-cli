import { AngularServeRunner, AngularServeCLI } from '../serve';
import { ServeRunnerDeps } from '../../../../../lib/serve';
import { CommandLineOptions } from '../../../../definitions';
import { Project } from '../../../../../lib/project';
import { AngularProject } from '../../../../../lib/project/angular';

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
          ssl: false,
          project: undefined,
          prod: undefined,
          platform: undefined,
        };

        it('should provide defaults with no options', () => {
          const runner = new AngularServeRunner({} as ServeRunnerDeps);
          const result = runner.createOptionsFromCommandLine([], {} as CommandLineOptions);
          expect(result).toEqual(defaults);
        });

        it('should provide options from negations of cli flag defaults', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
          expect(result).toEqual({ ...defaults, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true });
        });

        it('should turn off devapp for cordova', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { engine: 'cordova' });
          expect(result).toEqual({ ...defaults, devapp: false, engine: 'cordova' });
        });

        it('should allow overrides of default values', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { address: 'localhost', port: '1111' });
          expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111 });
        });

        it('should respect --local flag', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { local: true });
          expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
        });

        it('should respect --project and --configuration flags', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { project: 'app', configuration: 'production' });
          expect(result).toEqual({ ...defaults, project: 'app', configuration: 'production' });
        });

        it('should pass on separated args', () => {
          const runner = new AngularServeRunner({});
          const result = runner.createOptionsFromCommandLine([], { '--': ['foo', '--bar'] });
          expect(result).toEqual({ ...defaults, '--': ['foo', '--bar'] });
        });

      });

    });

    describe('AngularServeCLI', () => {

      describe('serveOptionsToNgArgs', () => {

        const defaults = {
          '--': [],
        };

        it('should pass cordova options', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const runner = new AngularServeCLI({ project });
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
          };

          const result = await runner.serveOptionsToNgArgs(options);
          expect(result).toEqual(jasmine.arrayContaining([
            `--platform=${options.platform}`,
            `--cordova-base-path=${root}`,
          ]));
        });

      });

    });

  });

});
