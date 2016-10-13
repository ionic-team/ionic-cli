import { IonicCommandOptions, CommandMetadata, Command, ICommand } from '@ionic/cli';

@CommandMetadata({
  name: 'ssh',
  description: 'Generate and manage SSH keys, configure local SSH authentication',
  isProjectTask: false
})
export default class SSHCommand extends Command implements ICommand {
  async run(env: IonicCommandOptions): Promise<void> {
    console.log('hi');
  }
}
