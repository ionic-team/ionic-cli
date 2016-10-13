import { Command, CommandEnvironment, CommandMetadata, ICommand } from '@ionic/cli';

@CommandMetadata({
  name: 'ssh',
  description: 'Generate and manage SSH keys, configure local SSH authentication',
  isProjectTask: false
})
export default class SSHCommand extends Command implements ICommand {
  async run(env: CommandEnvironment): Promise<void> {
    console.log('hi');
  }
}
