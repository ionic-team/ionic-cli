import { Command } from '../command';

describe('ionic', () => {

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
            {
              name: 'arg4',
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
        const inputs = [];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs });
        expect(results).toEqual([]);
      });

      it('should include additional, unknown arguments', async () => {
        const foo = new FooCommand();
        const inputs = ['a', 'b', 'c'];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs });
        expect(results).toEqual(['a', 'b', 'c']);
      });

      it('should include additional, unknown options', async () => {
        const foo = new FooCommand();
        const inputs = [];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt2: 'cow' });
        expect(results).toEqual(['--opt1', '--opt2=cow']);
      });

      it('should include known arguments and options', async () => {
        const bar = new BarCommand();
        const inputs = ['a', 'b'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt2: 'cow', opt3: 'not default' });
        expect(results).toEqual(['a', 'b', '--opt1', '--opt2=cow', '--opt3="not default"']);
      });

      it('should exclude options with default values', async () => {
        const bar = new BarCommand();
        const inputs = [];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt3: 'default' });
        expect(results).toEqual([]);
      });

      it('should exclude private arguments and options', async () => {
        const bar = new BarCommand();
        const inputs = ['a', 'b', 'c', 'd'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt4: 'private!' });
        expect(results).toEqual(['a', 'b', '*****', 'd', '--opt1']);
      });

      it('should exclude aliases', async () => {
        const bar = new BarCommand();
        const inputs = [];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, o: 'wow', opt5: 'wow' });
        expect(results).toEqual(['--opt5=wow']);
      });

      it('should include separated args', async () => {
        const bar = new BarCommand();
        const inputs = ['a'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, '--': ['other', 'args'], opt1: true });
        expect(results).toEqual(['a', '--opt1', '--', 'other', 'args']);
      });

    });

  });

});
