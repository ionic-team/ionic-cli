import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMap,
  CommandMetadata,
  ICommand,
  ICommandMap
} from '@ionic/cli';

import { SSHGenerateCommand } from './generate';
import { SSHUseCommand } from './use';
import { SSHAddCommand } from './add';

@CommandMetadata({
  name: 'ssh',
  description: 'Generate and manage SSH keys, configure local SSH authentication',
  get subcommands(): ICommandMap {
    let m = new CommandMap();

    m.set('generate', new SSHGenerateCommand());
    m.set('use', new SSHUseCommand());
    m.set('add', new SSHAddCommand());

    return m;
  },
  isProjectTask: false
})
export class SSHCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    console.log('ssh!', inputs, options);
  }
}
