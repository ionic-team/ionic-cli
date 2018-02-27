import { IClient, User } from '../definitions';
import { isUserResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export interface UserClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class UserClient {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: UserClientDeps) {
    this.client = client;
    this.token = token;
  }

  async loadSelf(): Promise<User> {
    const { req } = await this.client.make('GET', '/users/self');
    req.set('Authorization', `Bearer ${this.token}`);
    const res = await this.client.do(req);

    if (!isUserResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
