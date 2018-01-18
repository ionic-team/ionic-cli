import {
  Command,
  CommandMap,
  CommandMapDefault,
  Namespace,
  NamespaceMap,
} from '../command';

import { Executor } from '../executor';

export const superspy = () => {};

class MyNamespace extends Namespace {
  async getMetadata() {
    return { name: 'my' };
  }

  async getNamespaces() {
    return new NamespaceMap([
      ['foo', async () => new FooNamespace(this)],
      ['defns', async () => new NamespaceWithDefault(this)],
    ]);
  }
}

class NamespaceWithDefault extends Namespace {
  async getMetadata() {
    return { name: 'defns' };
  }

  async getCommands() {
    return new CommandMap([
      [CommandMapDefault, async () => new DefaultCommand(this)],
    ]);
  }
}

class FooNamespace extends Namespace {
  async getMetadata() {
    return { name: 'foo' };
  }

  async getCommands() {
    return new CommandMap([
      ['bar', async () => new BarCommand(this)],
      ['baz', async () => new BazCommand(this)],
      ['b', 'bar'],
    ]);
  }
}

class DefaultCommand extends Command {
  async getMetadata() {
    return { name: 'def', description: '' };
  }
}

class BarCommand extends Command {
  async getMetadata() {
    return { name: 'bar', description: '' };
  }

  async validate() {
    superspy('bar:validate', [...arguments]);
  }

  async run() {
    superspy('bar:run', [...arguments]);
  }
}

class BazCommand extends Command {
  async getMetadata() {
    return { name: 'baz', description: '' };
  }
}

class FooCommand extends Command {
  async getMetadata() {
    return {
      name: 'foo',
      type: 'global',
      description: '',
    };
  }
}

describe('@ionic/cli-framework', () => {

  describe('lib/executor', () => {

    describe('Executor', () => {

      it('should execute run function of found bar command', async () => {
        const ns = new MyNamespace();
        const executor = new Executor(ns);
        const spy = jest.spyOn(module.exports, 'superspy');
        await executor.execute(['foo', 'bar', 'a', 'b', '--', 'c'], {});
        expect(spy.mock.calls.length).toEqual(2);
        const [ [ validateId, validateArgs ], [ runId, runArgs ] ] = spy.mock.calls;
        expect(validateId).toEqual('bar:validate');
        expect(validateArgs[0]).toEqual(['a', 'b']);
        expect(runId).toEqual('bar:run');
        expect(runArgs[0]).toEqual(['a', 'b']);
        delete runArgs[1]._;
        expect(runArgs[1]).toEqual({ '--': ['c'] });
        expect(runArgs[2].location.obj).toBeInstanceOf(BarCommand);
        const runPath = runArgs[2].location.path.map(([n]) => n);
        const runPathObjs = runArgs[2].location.path.map(([, o]) => o);
        expect(runPath).toEqual(['my', 'foo', 'bar']);
        expect(runPathObjs[0]).toBeInstanceOf(MyNamespace);
        expect(runPathObjs[1]).toBeInstanceOf(FooNamespace);
        expect(runPathObjs[2]).toBeInstanceOf(BarCommand);
      });

    });

  });

});
