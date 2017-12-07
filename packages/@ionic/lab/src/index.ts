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
  parseArgs,
} from '@ionic/cli-framework/lib';

abstract class Command extends BaseCommand<CommandData> {}

class DefaultCommand extends Command {
  metadata = {
    name: 'default',
    description: '',
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    // TODO
  }
}

class CommandMap extends BaseCommandMap<Command, CommandData, CommandInput, CommandOption> {}

class Namespace extends BaseRootNamespace<Command, CommandData, CommandInput, CommandOption> {
  name = 'ionic-lab';

  commands = new CommandMap([
    ['default', async () => new DefaultCommand()],
  ]);
}

const ns = new Namespace();

export async function run(pargv: string[], env: { [k: string]: string; }) {
  const argv = parseArgs(pargv.slice(2), { boolean: true, string: '_' });

  if (argv._[0] !== 'default') {
    argv._.unshift('default');
  }

  const [ , inputs, cmd ] = await ns.locate(argv._);

  if (!(cmd instanceof DefaultCommand)) {
    process.exitCode = 1;
    return;
  }

  await cmd.run(inputs, argv);
}
