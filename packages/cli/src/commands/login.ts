import {
  APIResponse,
  APIResponseSuccess,
  CommandLineInputs,
  CommandLineOptions, ICommand
} from '../definitions';

import { Command, CommandMetadata } from '../lib/command';
import { validators } from '../lib/validators';

interface LoginResponse extends APIResponseSuccess {
  data: {
    token: string;
  }
}

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
export default class LoginCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [email, password] = inputs;

    let req = this.env.client.make('POST', '/login')
      .send({ email, password });

    let res = await this.env.client.do(req); // TODO: Handle errors nicely

    if (this.env.client.is<LoginResponse>(res, (r: LoginResponse) => r.data.token !== undefined)) {
      console.log('Logged in! Your token is:', res.data.token);
    } else {
      // TODO
    }
  }
}
