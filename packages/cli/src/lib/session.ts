import { APIResponseSuccess, IClient, IConfig, ISession } from '../definitions';

interface LoginResponse extends APIResponseSuccess {
  data: {
    token: string;
  }
}

function isLoginResponse(r: LoginResponse) {
  return r.data.token !== undefined;
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

    if (!this.client.is<LoginResponse>(res, isLoginResponse)) {
      throw 'todo'; // TODO
    }

    let c = await this.config.load();

    c.token = res.data.token;
  }
}
