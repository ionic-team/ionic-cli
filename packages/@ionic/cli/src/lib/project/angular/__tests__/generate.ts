import { CommandLineOptions } from '../../../../definitions';
import { AngularGenerateRunner } from '../generate';

describe('@ionic/cli', () => {

  describe('lib/project/angular/generate', () => {

    describe('AngularGenerateRunner', () => {

      describe('createOptionsFromCommandLine', () => {

        const defaults = {
          name: undefined,
          project: 'app',
          type: undefined,
        };

        it('should provide defaults with no inputs or options', () => {
          const runner = new AngularGenerateRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], {} as CommandLineOptions);
          expect(result).toEqual(defaults);
        });

        it('should provide options from inputs', () => {
          const runner = new AngularGenerateRunner({} as any);
          const result = runner.createOptionsFromCommandLine(['service', 'FancyBar'], { _: [] });
          expect(result).toEqual({ ...defaults, name: 'FancyBar', type: 'service' });
        });

        it('should respect --project', () => {
          const runner = new AngularGenerateRunner({} as any);
          const result = runner.createOptionsFromCommandLine([], { _: [], project: 'otherProject' });
          expect(result).toEqual({ ...defaults, project: 'otherProject' });
        });

      });

    });

  });

});
