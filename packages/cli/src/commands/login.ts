import { CommandEnvironment, ICommand } from '../definitions';
import { Command, CommandMetadata } from '../lib/command';

@CommandMetadata({
  name: 'login',
  description: 'Login with your Ionic ID',
  options: [
    {
      name: 'email',
      description: 'Your email address'
    },
    {
      name: 'password',
      description: 'Your password'
    }
  ],
  isProjectTask: false
})
export default class LoginCommand extends Command implements ICommand {
  async run(env: CommandEnvironment): Promise<void> {
    // TODO
  }
}
