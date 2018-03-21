import { Command } from '../command';

describe('@ionic/cli-utils', () => {

  describe('Command', () => {

    class FooCommand extends Command {
      async getMetadata() {
        return {
          name: 'foo',
          type: 'global',
        };
      }
    }

    class BarCommand extends Command {
      async getMetadata() {
        return {
          name: 'bar',
          type: 'global',
          inputs: [
            {
              name: 'arg1',
            },
            {
              name: 'arg2',
            },
            {
              name: 'arg3',
              private: true,
            },
          ],
          options: [
            {
              name: 'opt1',
              type: Boolean,
            },
            {
              name: 'opt2',
            },
            {
              name: 'opt3',
              default: 'default',
            },
            {
              name: 'opt4',
              private: true,
            },
            {
              name: 'opt5',
              aliases: ['o'],
            },
          ],
        };
      }
    }

    describe('getCleanInputsForTelemetry', () => {

      // TODO: aliases can be intelligently removed

      it('should be empty with no inputs', async () => {
        const foo = new FooCommand();
        const results = await foo.getCleanInputsForTelemetry([], {});
        expect(results).toEqual([]);
      });

      it('should include additional, unknown arguments', async () => {
        const foo = new FooCommand();
        const results = await foo.getCleanInputsForTelemetry(['a', 'b', 'c'], {});
        expect(results).toEqual(['a', 'b', 'c']);
      });

      it('should include additional, unknown options', async () => {
        const foo = new FooCommand();
        const results = await foo.getCleanInputsForTelemetry([], { opt1: true, opt2: 'cow' });
        expect(results).toEqual(['--opt1', '--opt2=cow']);
      });

      it('should include known arguments and options', async () => {
        const bar = new BarCommand();
        const results = await bar.getCleanInputsForTelemetry(['a', 'b'], { opt1: true, opt2: 'cow', opt3: 'not default' });
        expect(results).toEqual(['a', 'b', '--opt1', '--opt2=cow', '--opt3="not default"']);
      });

      it('should exclude options with default values', async () => {
        const bar = new BarCommand();
        const results = await bar.getCleanInputsForTelemetry([], { opt3: 'default' });
        expect(results).toEqual([]);
      });

      it('should exclude private arguments and options', async () => {
        const bar = new BarCommand();
        const results = await bar.getCleanInputsForTelemetry(['a', 'b', 'c'], { opt4: 'private!' });
        expect(results).toEqual(['a', 'b']);
      });

      it('should exclude aliases', async () => {
        const bar = new BarCommand();
        const results = await bar.getCleanInputsForTelemetry([], { o: 'wow', opt5: 'wow' });
        expect(results).toEqual(['--opt5=wow']);
      });

    });

  });

});
