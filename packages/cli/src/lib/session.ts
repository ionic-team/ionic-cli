import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  IClient,
  IConfig,
  ISession
} from '../definitions';

import { FatalException } from './errors';
import { createFatalAPIFormat, isAPIResponseSuccess } from './http';

interface LoginResponse extends APIResponseSuccess {
  data: {
    token: string;
  };
}

function isLoginResponse(r: APIResponse): r is LoginResponse {
  let res: LoginResponse = <LoginResponse>r;
  return isAPIResponseSuccess(res) && typeof res.data.token === 'string';
}

export class Session implements ISession {
  constructor(
    protected config: IConfig,
    protected client: IClient
  ) {}

  async login(email: string, password: string): Promise<void> {
    let req = this.client.make('POST', '/login')
      .send({ email, password });

    let res = await this.client.do(req); // TODO: Handle errors nicely

    if (!isLoginResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    let c = await this.config.load();

    c.token = res.data.token;
  }
}
