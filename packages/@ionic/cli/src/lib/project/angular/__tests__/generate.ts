import { CommandLineOptions } from '../../../../definitions';
import { AngularGenerateRunner, AngularGenerateRunnerDeps } from '../generate';

describe('@ionic/cli', () => {

  describe('lib/project/angular/generate', () => {

    describe('AngularGenerateRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          name: undefined,
          project: 'app',
          type: undefined,
        };

        const mockAngularGenerateRunnerDeps: AngularGenerateRunnerDeps = {
          project: {
            getWorkspaceDefaultProject: (): Promise<string> => {
              return Promise.resolve('app');
            },
          },
        } as any;

        it('should provide defaults with no inputs or options', async () => {
          const runner = new AngularGenerateRunner(mockAngularGenerateRunnerDeps);
          const result = await runner.createOptionsFromCommandLine([], {} as CommandLineOptions);
          expect(result).toEqual(defaults);
        });

        it('should provide options from inputs', async () => {
          const runner = new AngularGenerateRunner(mockAngularGenerateRunnerDeps);
          const result = await runner.createOptionsFromCommandLine(['service', 'FancyBar'], { _: [] });
          expect(result).toEqual({ ...defaults, name: 'FancyBar', type: 'service' });
        });

        it('should respect --project', async () => {
          const runner = new AngularGenerateRunner(mockAngularGenerateRunnerDeps);
          const result = await runner.createOptionsFromCommandLine([], { _: [], project: 'otherProject' });
          expect(result).toEqual({ ...defaults, project: 'otherProject' });
        });

      });

    });

  });

});
