import { CommandMetadata, NamespaceMetadata } from '../../definitions';
import { Command } from '../command';
import { Namespace } from '../namespace';

class MyNamespace extends Namespace {
  async getMetadata(): Promise<NamespaceMetadata> {
    return {
      name: 'my',
      summary: '',
    };
  }
}

class FooCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'foo',
      type: 'global',
      summary: '',
    };
  }

  async run() {}
}

class BarCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'bar',
      type: 'global',
      summary: '',
      inputs: [
        {
          name: 'arg1',
          summary: '',
        },
        {
          name: 'arg2',
          summary: '',
        },
        {
          name: 'arg3',
          summary: '',
          private: true,
        },
        {
          name: 'arg4',
          summary: '',
        },
      ],
      options: [
        {
          name: 'opt1',
          summary: '',
          type: Boolean,
        },
        {
          name: 'opt2',
          summary: '',
        },
        {
          name: 'opt3',
          summary: '',
          default: 'default',
        },
        {
          name: 'opt4',
          summary: '',
          private: true,
        },
        {
          name: 'opt5',
          summary: '',
          aliases: ['o'],
        },
      ],
    };
  }

  async run() {}
}

describe('ionic', () => {

  describe('Command', () => {

    describe('getCleanInputsForTelemetry', () => {

      const myns = new MyNamespace(undefined);

      // TODO: aliases can be intelligently removed

      it('should be empty with no inputs', async () => {
        const foo = new FooCommand(myns);
        const inputs: string[] = [];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs });
        expect(results).toEqual([]);
      });

      it('should include additional, unknown arguments', async () => {
        const foo = new FooCommand(myns);
        const inputs = ['a', 'b', 'c'];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs });
        expect(results).toEqual(['a', 'b', 'c']);
      });

      it('should include additional, unknown options', async () => {
        const foo = new FooCommand(myns);
        const inputs: string[] = [];
        const results = await foo.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt2: 'cow' });
        expect(results).toEqual(['--opt1', '--opt2=cow']);
      });

      it('should include known arguments and options', async () => {
        const bar = new BarCommand(myns);
        const inputs = ['a', 'b'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt2: 'cow', opt3: 'not default' });
        expect(results).toEqual(['a', 'b', '--opt1', '--opt2=cow', '--opt3="not default"']);
      });

      it('should exclude options with default values', async () => {
        const bar = new BarCommand(myns);
        const inputs: string[] = [];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt3: 'default' });
        expect(results).toEqual([]);
      });

      it('should exclude private arguments and options', async () => {
        const bar = new BarCommand(myns);
        const inputs = ['a', 'b', 'c', 'd'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, opt1: true, opt4: 'private!' });
        expect(results).toEqual(['a', 'b', '*****', 'd', '--opt1']);
      });

      it('should exclude aliases', async () => {
        const bar = new BarCommand(myns);
        const inputs: string[] = [];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, o: 'wow', opt5: 'wow' });
        expect(results).toEqual(['--opt5=wow']);
      });

      it('should include separated args', async () => {
        const bar = new BarCommand(myns);
        const inputs = ['a'];
        const results = await bar.getCleanInputsForTelemetry(inputs, { _: inputs, '--': ['other', 'args'], opt1: true });
        expect(results).toEqual(['a', '--opt1', '--', 'other', 'args']);
      });

    });

  });

});
