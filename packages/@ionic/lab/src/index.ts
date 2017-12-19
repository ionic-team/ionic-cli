import * as http from 'http';
import * as path from 'path';

import chalk from 'chalk';
import opn = require('opn');
import * as express from 'express';

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
        name: 'host',
        description: 'HTTP host of Ionic Lab',
        default: 'localhost',
      },
      {
        name: 'port',
        description: 'HTTP port of Ionic Lab',
        default: '8200',
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
    const { host, port, open } = options;

    const app = express();

    app.use('/', express.static(path.join(__dirname, '..', 'www')));

    const server = http.createServer(app);
    server.listen({ port, host });

    const labUrl = `http://localhost:${port}/?url=${encodeURIComponent(url)}`;

    server.on('listening', () => {
      console.log('Ionic Lab running!');
      console.log(`Lab: ${chalk.bold(labUrl)}`);
      console.log(`App: ${chalk.bold(url)}`);
    });

    if (open) {
      opn(labUrl);
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
