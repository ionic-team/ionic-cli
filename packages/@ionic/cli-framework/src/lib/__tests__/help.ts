import { Command, CommandMap, CommandMapDefault, Namespace, NamespaceMap } from '../command';
import { CommandGroup, NamespaceGroup, OptionGroup, CommandStringHelpFormatter, NamespaceStringHelpFormatter, NamespaceSchemaHelpFormatter } from '../help';
import { stripAnsi } from '../../utils/format';

class MyNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'my',
      summary: 'the my namespace',
    };
  }

  async getNamespaces(): Promise<NamespaceMap> {
    return new NamespaceMap([
      ['foo', async () => new FooNamespace(this)],
      ['defns', async () => new NamespaceWithDefault(this)],
      ['f', 'foo'],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
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
      groups: [NamespaceGroup.Beta],
    };
  }

  async getCommands(): Promise<CommandMap> {
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
      description: 'my description with this footnote[^here] and more text',
      footnotes: [
        {
          id: 'here',
          text: 'A footnote is a thing',
        },
      ],
    };
  }

  async getCommands(): Promise<CommandMap> {
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
      groups: [CommandGroup.Beta],
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
      description: 'my description with a numeric link footnote[^1] and some more text',
      footnotes: [
        {
          id: 1,
          url: 'https://ionicframework.com',
        },
      ],
      inputs: [
        { name: 'input1', summary: 'input1 summary' },
        { name: 'input2', summary: 'input2 summary' },
      ],
      options: [
        { name: 'opt1', summary: 'opt1 summary', aliases: ['o'], spec: { value: 'optvalue' } },
        { name: 'opt2', summary: 'opt2 summary', groups: [OptionGroup.Advanced] },
        { name: 'opt3', summary: 'opt3 summary', type: Boolean },
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

describe('@ionic/cli-framework', () => {

  describe('lib/help', () => {

    describe('CommandStringHelpFormatter', () => {

      it('should format a command appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate(['foo', 'bar']);
        const formatter = new CommandStringHelpFormatter({ location, command: location.obj as any });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my foo bar - the bar command

    my description with a numeric link footnote[1] and some more text
    
    [1]: https://ionicframework.com

  Usage:

    $ my foo bar [<input1>] [<input2>] [options]

  Inputs:

    input1 .......................... input1 summary
    input2 .......................... input2 summary

  Options:

    --opt1=<optvalue>, -o=? ......... opt1 summary
    --opt2=<opt2> ................... opt2 summary
    --opt3 .......................... opt3 summary

  Examples:

    $ my foo bar 
    $ my foo bar input1 input2
    $ my foo bar --opt1 --opt2

`);
      });

    });

    describe('NamespaceStringHelpFormatter', () => {

      it('should format a namespace appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate([]);
        const formatter = new NamespaceStringHelpFormatter({ location, namespace: location.obj as any });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my - the my namespace

  Usage:

    $ my <command> [<args>] [--help] [options]

  Commands:

    bar ............................. the bar command
    defns <subcommand> .............. (beta) the defns namespace (subcommands: def)
    foo <subcommand> ................ the foo namespace (subcommands: bar, baz) (alias: f)

`);
      });

      it('should format a subnamespace appropriately', async () => {
        const myns = new MyNamespace();
        const location = await myns.locate(['foo']);
        const formatter = new NamespaceStringHelpFormatter({ location, namespace: location.obj as any });
        const result = await formatter.format();

        expect(stripAnsi(result)).toEqual(`
  my foo - the foo namespace

    my description with this footnote[1] and more text
    
    [1]: A footnote is a thing

  Usage:

    $ my foo <command> [<args>] [--help] [options]

  Commands:

    bar ............................. the bar command (alias: b)
    baz ............................. the baz command (aliases: b1, b2)

`);
      });

    });

    describe('NamespaceSchemaHelpFormatter', () => {

      it('should produce expected output for root namespace', async () => {
        const expected = {
          "name": "my",
          "summary": "the my namespace",
          "description": "",
          "groups": [],
          "aliases": [],
          "commands": [
            {
              "name": "my bar",
              "namespace": [
                "my"
              ],
              "summary": "the bar command",
              "description": "my description with a numeric link footnote[^1] and some more text",
              "groups": [],
              "exampleCommands": [
                "my bar ",
                "my bar input1 input2",
                "my bar --opt1 --opt2"
              ],
              "footnotes": [
                {
                  "type": "link",
                  "id": 1,
                  "url": "https://ionicframework.com"
                }
              ],
              "aliases": [],
              "inputs": [
                {
                  "name": "input1",
                  "summary": "input1 summary",
                  "required": false
                },
                {
                  "name": "input2",
                  "summary": "input2 summary",
                  "required": false
                }
              ],
              "options": [
                {
                  "name": "opt1",
                  "type": "string",
                  "summary": "opt1 summary",
                  "groups": [],
                  "aliases": [
                    "o"
                  ],
                  "spec": {
                    "value": "optvalue"
                  },
                },
                {
                  "name": "opt2",
                  "type": "string",
                  "summary": "opt2 summary",
                  "aliases": [],
                  "groups": [
                    "advanced"
                  ],
                  "spec": {
                    "value": "opt2"
                  },
                },
                {
                  "name": "opt3",
                  "type": "boolean",
                  "summary": "opt3 summary",
                  "aliases": [],
                  "groups": [],
                  "spec": {
                    "value": "true/false"
                  },
                },
              ]
            },
            {
              "name": "my foo bar",
              "namespace": [
                "my",
                "foo"
              ],
              "summary": "the bar command",
              "description": "my description with a numeric link footnote[^1] and some more text",
              "groups": [],
              "exampleCommands": [
                "my foo bar ",
                "my foo bar input1 input2",
                "my foo bar --opt1 --opt2"
              ],
              "footnotes": [
                {
                  "type": "link",
                  "id": 1,
                  "url": "https://ionicframework.com"
                }
              ],
              "aliases": [
                "my foo b"
              ],
              "inputs": [
                {
                  "name": "input1",
                  "summary": "input1 summary",
                  "required": false
                },
                {
                  "name": "input2",
                  "summary": "input2 summary",
                  "required": false
                }
              ],
              "options": [
                {
                  "name": "opt1",
                  "type": "string",
                  "summary": "opt1 summary",
                  "groups": [],
                  "aliases": [
                    "o"
                  ],
                  "spec": {
                    "value": "optvalue"
                  },
                },
                {
                  "name": "opt2",
                  "type": "string",
                  "summary": "opt2 summary",
                  "groups": [
                    "advanced"
                  ],
                  "aliases": [],
                  "spec": {
                    "value": "opt2"
                  },
                },
                {
                  "name": "opt3",
                  "type": "boolean",
                  "summary": "opt3 summary",
                  "aliases": [],
                  "groups": [],
                  "spec": {
                    "value": "true/false"
                  },
                },
              ]
            },
            {
              "name": "my foo baz",
              "namespace": [
                "my",
                "foo"
              ],
              "summary": "the baz command",
              "description": "",
              "groups": [],
              "exampleCommands": [],
              "footnotes": [],
              "aliases": [
                "my foo b1",
                "my foo b2"
              ],
              "inputs": [],
              "options": []
            },
            {
              "name": "my defns",
              "namespace": [
                "my"
              ],
              "summary": "the default command",
              "description": "",
              "groups": [
                "beta"
              ],
              "exampleCommands": [],
              "footnotes": [],
              "aliases": [],
              "inputs": [],
              "options": []
            }
          ]
        };
        const myns = new MyNamespace();
        const location = await myns.locate([]);
        const formatter = new NamespaceSchemaHelpFormatter({ location, namespace: location.obj as any });
        const result = await formatter.serialize();
        expect(result).toEqual(expected);
      });

    });

  });

});
