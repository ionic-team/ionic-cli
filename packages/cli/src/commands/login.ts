import { CommandLineInputs, CommandLineOptions } from '../definitions';

import { Command, CommandMetadata } from '../lib/command';
import { validators } from '../lib/validators';

@CommandMetadata({
  name: 'login',
  description: 'Login with your Ionic ID',
  inputs: [
    {
      name: 'email',
      description: 'Your email address',
      prompt: {
        message: 'email address'
      },
      validators: [validators.required, validators.email]
    },
    {
      name: 'password',
      description: 'Your password',
      prompt: {
        type: 'password',
        message: 'password'
      },
      validators: [validators.required]
    }
  ],
  isProjectTask: false
})
export class LoginCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    await this.env.session.login(email, password);
  }
}
