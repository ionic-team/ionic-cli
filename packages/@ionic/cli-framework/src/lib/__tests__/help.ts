import {
  Command,
  CommandMap,
  CommandMapDefault,
  Namespace,
  NamespaceMap,
} from '../command';

import { stripAnsi } from '../../utils/format';
import { DISABLED_COLORS } from '../colors';
import { CommandHelpFormatter, NamespaceHelpFormatter } from '../help';

class MyNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'my',
      description: 'the my namespace',
    };
  }

  async getNamespaces() {
    return new NamespaceMap([
      ['foo', async () => new FooNamespace(this)],
      ['defns', async () => new NamespaceWithDefault(this)],
    ]);
  }

  async getCommands() {
    return new CommandMap([
      ['bar', async () => new BarCommand(this)],
    ]);
  }
}

class NamespaceWithDefault extends Namespace {
  async getMetadata() {
    return {
      name: 'defns',
      description: 'the defns namespace',
    };
  }

  async getCommands() {
    return new CommandMap([
      [CommandMapDefault, async () => new DefaultCommand(this)],
    ]);
  }
}

class FooNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'foo',
      description: 'the foo namespace',
      longDescription: 'my long description',
    };
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
    return {
      name: 'def',
      description: 'the default command',
    };
  }

  async run() {}
  async validate() {}
}

class BarCommand extends Command {
  async getMetadata() {
    return {
      name: 'bar',
      description: 'the bar command',
      longDescription: 'my long description',
      inputs: [
        { name: 'input1', description: 'input1 description' },
        { name: 'input2', description: 'input2 description' },
      ],
      options: [
        { name: 'opt1', description: 'opt1 description' },
        { name: 'opt2', description: 'opt2 description' },
      ],
      exampleCommands: ['', 'input1 input2', '--opt1 --opt2'],
    };
  }

  async run() {}
  async validate() {}
}

class BazCommand extends Command {
  async getMetadata() {
    return {
      name: 'baz',
      description: 'the baz command',
    };
  }

  async run() {}
  async validate() {}
}

class FooCommand extends Command {
  async getMetadata() {
    return {
      name: 'foo',
      type: 'global',
      description: 'the foo command',
    };
  }

  async run() {}
  async validate() {}
}

describe('@ionic/cli-framework', () => {

  describe('lib/help', () => {

    describe('CommandHelpFormatter', () => {

      it('should format a command appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate(['foo', 'bar']);
        const formatter = new CommandHelpFormatter({ location, command: location.obj });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my foo bar - the bar command

    my long description

  Usage:

    $ my foo bar [<input1>] [<input2>] [options]

  Inputs:

    input1 ................... input1 description
    input2 ................... input2 description

  Options:

    --opt1 ................... opt1 description
    --opt2 ................... opt2 description

  Examples:

    $ my foo bar
    $ my foo bar input1 input2
    $ my foo bar --opt1 --opt2

`);
      });

    });

    describe('NamespaceHelpFormatter', () => {

      it('should format a command appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate([]);
        const formatter = new NamespaceHelpFormatter({ location, namespace: location.obj });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my - the my namespace

  Usage:

    $ my <command> [<args>] [--help] [options]

  Commands:

    bar ...................... the bar command
    defns <subcommand> ....... the defns namespace (subcommands: def)
    foo <subcommand> ......... the foo namespace (subcommands: bar, baz)

`);
      });

    });

  });

});
