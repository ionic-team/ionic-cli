import { Command, CommandMap, CommandMapDefault, Namespace, NamespaceMap } from '../command';
import { CommandMetadata, NamespaceMetadata } from '../../definitions';

import { Executor } from '../executor';

export const superspy = jest.fn();

class MyNamespace extends Namespace {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'my',
      summary: '',
    };
  }

  async getNamespaces(): Promise<NamespaceMap> {
    return new NamespaceMap([
      ['foo', async () => new FooNamespace(this)],
      ['defns', async () => new NamespaceWithDefault(this)],
    ]);
  }
}

class NamespaceWithDefault extends Namespace {
  async getMetadata(): Promise<NamespaceMetadata> {
    return {
      name: 'defns',
      summary: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      [CommandMapDefault, async () => new DefaultCommand(this)],
    ]);
  }
}

class FooNamespace extends Namespace {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'foo',
      summary: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['bar', async () => new BarCommand(this)],
      ['baz', async () => new BazCommand(this)],
      ['b', 'bar'],
    ]);
  }
}

class DefaultCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'def',
      summary: '',
    };
  }

  async run() {}
}

class BarCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'bar',
      summary: '',
    };
  }

  async validate() {
    superspy('bar:validate', [...arguments]);
  }

  async run() {
    superspy('bar:run', [...arguments]);
  }
}

class BazCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'baz',
      summary: '',
    };
  }

  async run() {}
}

describe('@ionic/cli-framework', () => {

  const spy = jest.spyOn(module.exports, 'superspy');

  beforeEach(() => {
    spy.mockReset();
  });

  describe('lib/executor', () => {

    describe('Executor', () => {

      describe('execute', () => {

        it('should call run function of found bar command', async () => {
          const namespace = new MyNamespace();
          const executor = new Executor({ namespace });
          await executor.execute(['foo', 'bar', 'a', 'b', '--', 'c'], {});
          expect(spy.mock.calls.length).toEqual(2);
          const [ [ validateId, validateArgs ], [ runId, runArgs ] ] = spy.mock.calls;
          expect(validateId).toEqual('bar:validate');
          expect(validateArgs).toEqual([['a', 'b']]);
          expect(runId).toEqual('bar:run');
          const args: any = runArgs;
          expect(args[0]).toEqual(['a', 'b']);
          expect(args[1]).toEqual({ '--': ['c'], '_': ['a', 'b'] });
          expect(args[2].location.obj).toBeInstanceOf(BarCommand);
          const runPath = args[2].location.path.map(([n]: any) => n);
          const runPathObjs = args[2].location.path.map(([, o]: any) => o);
          expect(runPath).toEqual(['my', 'foo', 'bar']);
          expect(runPathObjs[0]).toBeInstanceOf(MyNamespace);
          expect(runPathObjs[1]).toBeInstanceOf(FooNamespace);
          expect(runPathObjs[2]).toBeInstanceOf(BarCommand);
        });

      });

      describe('run', () => {

        it('should call run function of bar command', async () => {
          const namespace = new MyNamespace();
          const executor = new Executor({ namespace });
          const location = await namespace.locate(['foo', 'bar']);
          await executor.run(location.obj as any, []);
          expect(spy.mock.calls.length).toEqual(2);
          const [ [ validateId, validateArgs ], [ runId, runArgs ] ] = spy.mock.calls;
          expect(validateId).toEqual('bar:validate');
          expect(validateArgs).toEqual([[]]);
          expect(runId).toEqual('bar:run');
          expect(runArgs).toEqual([[], { '--': [], '_': [] }, undefined]);
        });

      });

    });

  });

});
