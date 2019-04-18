import { Command, CommandMap, CommandMapDefault, Namespace, NamespaceMap } from '../command';
import { CommandMetadata, NamespaceMetadata } from '../../definitions';

import { getCompletionWords } from '../completion';

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
      ['f', 'foo'],
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
  async getMetadata(): Promise<NamespaceMetadata> {
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

class EmptyNamespace extends Namespace {
  async getMetadata(): Promise<NamespaceMetadata> {
    return {
      name: 'empty',
      summary: ''
    };
  }
}

class DefaultCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'def',
      summary: '',
      options: [
        {
          name: 'str-opt',
          summary: '',
        },
        {
          name: 'bool-opt',
          summary: '',
          type: Boolean,
          default: true,
        },
      ],
    };
  }

  async run() {}
}

class BarCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'bar',
      summary: '',
      options: [
        {
          name: 'str-opt',
          summary: '',
        },
        {
          name: 'bool-opt',
          summary: '',
          type: Boolean,
          default: true,
        },
      ],
    };
  }

  async run() {}
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

  describe('lib/completion', () => {

    describe('getCompletionWords', () => {

      it('should have no words for empty namespace', async () => {
        const ns = new EmptyNamespace();
        const words = await getCompletionWords(ns, []);
        expect(words).toEqual([]);
      });

      it('should return command words for a namespace', async () => {
        const ns = new FooNamespace();
        const words = await getCompletionWords(ns, []);
        expect(words).toEqual(['bar', 'baz']);
      });

      it('should return command and namespace words for a namespace', async () => {
        const ns = new MyNamespace();
        const words = await getCompletionWords(ns, []);
        expect(words).toEqual(['defns', 'foo']);
      });

      it('should return options from a default namespace', async () => {
        const ns = new MyNamespace();
        debugger;
        const words = await getCompletionWords(ns, ['defns']);
        expect(words).toEqual(['--no-bool-opt', '--str-opt']);
      });

      it('should return options from a command', async () => {
        const ns = new MyNamespace();
        debugger;
        const words = await getCompletionWords(ns, ['foo', 'bar']);
        expect(words).toEqual(['--no-bool-opt', '--str-opt']);
      });

      it('should return unique options from a command', async () => {
        const ns = new MyNamespace();
        debugger;
        const words = await getCompletionWords(ns, ['foo', 'bar', '--str-opt']);
        expect(words).toEqual(['--no-bool-opt']);
      });

    })

  });

});
