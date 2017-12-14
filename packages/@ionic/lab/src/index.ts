import * as path from 'path';

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
  RootNamespace as BaseRootNamespace,
  metadataToParseArgsOptions,
  parseArgs,
  validators,
} from '@ionic/cli-framework/lib';

abstract class Command extends BaseCommand<CommandData> {}

class DefaultCommand extends Command {
  metadata = {
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
    ],
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const [ url ] = inputs;
    const { port } = options;

    console.log(url);

    const app = express();

    app.use('/static', express.static(path.join(__dirname, '..', 'assets', 'lab', 'static')));
    app.get('/', (req, res) => res.sendFile('index.html', { root: path.join(__dirname, '..', 'assets', 'lab') }));

    app.get('/api/app-config', (req, res) => {
      res.set('Content-Type', 'application/json');
      res.send({ url });
    });

    app.listen(port);
  }
}

class CommandMap extends BaseCommandMap<Command, CommandData, CommandInput, CommandOption> {}

class Namespace extends BaseRootNamespace<Command, CommandData, CommandInput, CommandOption> {
  name = 'ionic-lab';
  description = '';
  longDescription = '';

  commands = new CommandMap([
    ['default', async () => new DefaultCommand()],
  ]);
}

const ns = new Namespace();

export async function run(pargv: string[], env: { [k: string]: string; }) {
  pargv = pargv.slice(2);
  const argv = parseArgs(pargv, { boolean: true, string: '_' });

  // TODO: build this into cli-framework: the concept of default commands for namespaces
  if (argv._[0] !== 'default') {
    argv._.unshift('default');
  }

  const [ , , cmd ] = await ns.locate(argv._);

  if (!(cmd instanceof DefaultCommand)) {
    process.exitCode = 1;
    return;
  }

  const args = parseArgs(pargv, metadataToParseArgsOptions(cmd.metadata));

  await cmd.validate(args._);
  await cmd.run(args._, args);
}
