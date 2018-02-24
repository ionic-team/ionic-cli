import { IClient, ResourceClient, SecurityProfile } from '../definitions';
import { isSecurityProfileResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export interface SecurityClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class SecurityClient implements ResourceClient<SecurityProfile, never> {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: SecurityClientDeps) {
    this.client = client;
    this.token = token;
  }

  async load(tag: string): Promise<SecurityProfile> {
    const { req } = await this.client.make('GET', `/security/profiles/${tag}`);
    req.set('Authorization', `Bearer ${this.token}`).query({}).send();
    const res = await this.client.do(req);

    if (!isSecurityProfileResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
