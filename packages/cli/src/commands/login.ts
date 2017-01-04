import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';
import { validators } from '@ionic/cli-utils';

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
  ]
})
export class LoginCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');
  }
}
