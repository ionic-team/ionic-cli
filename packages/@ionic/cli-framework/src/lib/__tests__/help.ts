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
      summary: 'the my namespace',
    };
  }

  async getNamespaces() {
    return new NamespaceMap([
      ['foo', async () => new FooNamespace(this)],
      ['defns', async () => new NamespaceWithDefault(this)],
      ['f', 'foo'],
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
      summary: 'the defns namespace',
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
      summary: 'the foo namespace',
      description: 'my description',
    };
  }

  async getCommands() {
    return new CommandMap([
      ['bar', async () => new BarCommand(this)],
      ['baz', async () => new BazCommand(this)],
      ['b', 'bar'],
      ['b1', 'baz'],
      ['b2', 'baz'],
    ]);
  }
}

class DefaultCommand extends Command {
  async getMetadata() {
    return {
      name: 'def',
      summary: 'the default command',
    };
  }

  async run() {}
  async validate() {}
}

class BarCommand extends Command {
  async getMetadata() {
    return {
      name: 'bar',
      summary: 'the bar command',
      description: 'my description',
      inputs: [
        { name: 'input1', summary: 'input1 summary' },
        { name: 'input2', summary: 'input2 summary' },
      ],
      options: [
        { name: 'opt1', summary: 'opt1 summary' },
        { name: 'opt2', summary: 'opt2 summary' },
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
      summary: 'the baz command',
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
      summary: 'the foo command',
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

    my description

  Usage:

    $ my foo bar [<input1>] [<input2>] [options]

  Inputs:

    input1 ................... input1 summary
    input2 ................... input2 summary

  Options:

    --opt1 ................... opt1 summary
    --opt2 ................... opt2 summary

  Examples:

    $ my foo bar
    $ my foo bar input1 input2
    $ my foo bar --opt1 --opt2

`);
      });

    });

    describe('NamespaceHelpFormatter', () => {

      it('should format a namespace appropriately', async () => {
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
    foo <subcommand> ......... the foo namespace (subcommands: bar, baz) (alias: f)

`);
      });

      it('should format a subnamespace appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate(['foo']);
        const formatter = new NamespaceHelpFormatter({ location, namespace: location.obj });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my foo - the foo namespace

    my description

  Usage:

    $ my foo <command> [<args>] [--help] [options]

  Commands:

    bar ...................... the bar command (alias: b)
    baz ...................... the baz command (aliases: b1, b2)

`);
      });

    });

  });

});
