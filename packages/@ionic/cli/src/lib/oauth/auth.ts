import { IClient, ResourceClientLoad } from '../../definitions';
import { isAuthConnectionResponse } from '../../guards';
import { ResourceClient, createFatalAPIFormat } from '../http';

export interface AuthConnection {
  readonly uuid: string;
}

export interface AuthClientDeps {
  readonly client: IClient;
}

export class AuthClient extends ResourceClient {
  readonly connections: AuthConnectionClient;

  constructor(readonly e: AuthClientDeps) {
    super();
    this.connections = new AuthConnectionClient(e);
  }
}

export class AuthConnectionClient extends ResourceClient implements ResourceClientLoad<AuthConnection> {
  constructor(readonly e: AuthClientDeps) {
    super();
  }

  async load(email: string): Promise<AuthConnection> {
    const { req } = await this.e.client.make('GET', `/auth/connections/${email}`);
    const res = await this.e.client.do(req);

    if (!isAuthConnectionResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
