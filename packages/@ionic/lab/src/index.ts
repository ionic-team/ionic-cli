import * as path from 'path';

import * as express from 'express';
import opn = require('opn');

import {
  CommandData,
  CommandInput,
  CommandLineInputs,
  CommandLineOptions,
  CommandOption,
} from '@ionic/cli-framework';

import {
  Command as BaseCommand,
  CommandMap as BaseCommandMap,
  CommandMapDefault,
  RootNamespace as BaseRootNamespace,
  execute,
  validators,
} from '@ionic/cli-framework/lib';

abstract class Command extends BaseCommand<CommandData> {}

class DefaultCommand extends Command {
  metadata: CommandData = {
    name: 'default',
    description: '',
    inputs: [
      {
        name: 'url',
        description: 'The URL of the livereload server to use with lab',
        validators: [validators.required, validators.url],
      },
    ],
    options: [
      {
        name: 'port',
        description: 'HTTP port of Ionic Lab',
        default: '8100',
      },
      {
        name: 'open',
        description: 'Automatically open Ionic Lab',
        type: Boolean,
        default: true,
      },
    ],
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const [ url ] = inputs;
    const { port, open } = options;

    const app = express();

    app.use('/', express.static(path.join(__dirname, '..', 'www')));

    app.listen(port);

    if (open) {
      opn(`http://localhost:${port}/?url=${encodeURIComponent(url)}`);
    }
  }
}

class CommandMap extends BaseCommandMap<Command, CommandData, CommandInput, CommandOption> {}

class Namespace extends BaseRootNamespace<Command, CommandData, CommandInput, CommandOption> {
  metadata = {
    name: 'ionic-lab',
    description: '',
  };

  commands = new CommandMap([[CommandMapDefault, async () => new DefaultCommand()]]);
}

const ns = new Namespace();

export async function run(pargv: string[], env: { [k: string]: string; }) {
  await execute(ns, pargv.slice(2), env);
}
