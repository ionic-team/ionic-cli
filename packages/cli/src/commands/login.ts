import * as fetch from 'node-fetch';

import {
  APIResponse,
  APIResponseSuccess,
  CommandLineInputs,
  CommandLineOptions,
  ICommand
} from '../definitions';

import { isAPIResponseSuccess } from '../lib/api';
import { Command, CommandMetadata } from '../lib/command';
import { validators } from '../lib/validators';

interface LoginResponse extends APIResponseSuccess {
  data: {
    token: string;
  }
}

function isLoginResponse(r: APIResponseSuccess): r is LoginResponse {
  return (<LoginResponse>r).data.token !== undefined;
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

    // TODO: Cleanup and make reusable!
    const r = await fetch(`${this.env.urls.api}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inputs[0], password: inputs[1] })
    });

    const j = await r.json<APIResponse>();

    if (isAPIResponseSuccess(j)) {
      if (isLoginResponse(j)) {
        console.log('Logged in! Your token is:', j.data.token);
      } else {
        console.error('Unrecognized API response.', j);
      }
    } else {
      console.error(j.error);
    }
  }
}
