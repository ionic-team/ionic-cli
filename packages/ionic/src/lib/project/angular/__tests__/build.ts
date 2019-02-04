import { AngularBuildCLI } from '../build';

describe('ionic', () => {

  describe('lib/project/angular/build', () => {

    describe('AngularBuildCLI', () => {

      describe('buildOptionsToNgArgs', () => {

        const defaults = {
          '--': [],
        };

        it('should pass options', async () => {
          const project = {};
          const cli = new AngularBuildCLI({ project } as any);
          const options = {
            ...defaults,
            sourcemaps: true,
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).toEqual(['--source-map']);
        });

        it('should pass cordova options', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const cli = new AngularBuildCLI({ project } as any);
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).toEqual([
            `--platform=${options.platform}`,
            `--cordova-base-path=${root}`,
          ]);
        });

        it('should pass separated options', async () => {
          const project = {};
          const cli = new AngularBuildCLI({ project } as any);
          const options = {
            ...defaults,
            '--': ['--extra=true'],
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).toEqual(['--extra=true']);
        });

        it('should not pass separated options for cordova', async () => {
          const root = 'fakeRoot';
          const project = {
            requireIntegration: jest.fn(() => ({ root })),
          };
          const cli = new AngularBuildCLI({ project } as any);
          const options = {
            ...defaults,
            engine: 'cordova',
            platform: 'fakePlatform',
            '--': ['--extra=true'],
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).not.toEqual(expect.arrayContaining(['--extra=true']));
        });

        it('should pass configuration and project for custom program', async () => {
          const project = {};
          const cli = new AngularBuildCLI({ project } as any);
          (cli as any)._resolvedProgram = 'npm';
          const options = {
            ...defaults,
            configuration: 'production',
            project: 'otherProject',
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).toEqual(['--configuration=production', '--project=otherProject']);
        });

        it('should not pass configuration and project for custom program if they are the defaults', async () => {
          const project = {};
          const cli = new AngularBuildCLI({ project } as any);
          (cli as any)._resolvedProgram = 'npm';
          const options = {
            ...defaults,
          };

          const result = await (cli as any).buildOptionsToNgArgs(options);
          expect(result).toEqual([]);
        });

      });

    });

  });

});
