import { IClient, ResourceClientLoad, SecurityProfile } from '../definitions';
import { isSecurityProfileResponse } from '../guards';
import { ResourceClient, createFatalAPIFormat } from './http';

export interface SecurityClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class SecurityClient extends ResourceClient implements ResourceClientLoad<SecurityProfile> {
  protected readonly client: IClient;
  protected readonly token: string;

  constructor({ client, token }: SecurityClientDeps) {
    super();
    this.client = client;
    this.token = token;
  }

  async load(tag: string): Promise<SecurityProfile> {
    const { req } = await this.client.make('GET', `/security/profiles/${tag}`);
    this.applyAuthentication(req, this.token);
    req.query({}).send();
    const res = await this.client.do(req);

    if (!isSecurityProfileResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
