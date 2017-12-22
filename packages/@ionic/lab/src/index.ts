import * as http from 'http';
import * as path from 'path';

import chalk from 'chalk';
import * as express from 'express';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMap,
  CommandMapDefault,
  Namespace,
  execute,
  validators,
} from '@ionic/cli-framework';

class DefaultCommand extends Command {
  async getMetadata() {
    return {
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
          name: 'app-name',
          description: 'App name to show in bottom left corner',
        },
        {
          name: 'app-version',
          description: 'App version to show in bottom left corner',
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const [ url ] = inputs;
    const { host, port } = options;

    const name = options['app-name'];
    const version = options['app-version'];

    const app = express();

    app.use('/', express.static(path.join(__dirname, '..', 'www')));

    app.get('/api/app', (req, res) => {
      res.json({ url, name, version });
    });

    const server = http.createServer(app);
    server.listen({ port, host });

    const labUrl = `http://${host}:${port}`;

    server.on('listening', () => {
      process.stdout.write(
        'Ionic Lab running!\n' +
        `Lab: ${chalk.bold(labUrl)}\n` +
        `App: ${chalk.bold(url)}\n`
      );
    });
  }
}

class LabNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-lab',
      description: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([[CommandMapDefault, async () => new DefaultCommand(this)]]);
  }
}

const ns = new LabNamespace();

export async function run(pargv: string[], env: { [k: string]: string; }) {
  await execute(ns, pargv.slice(2), env);
}
