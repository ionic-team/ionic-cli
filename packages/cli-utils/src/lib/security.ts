import { IClient, SecurityProfile } from '../definitions';
import { isSecurityProfileResponse, isSecurityProfilesResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export class SecurityClient {
  constructor(protected appUserToken: string, protected client: IClient) {}

  async getProfile(tag: string): Promise<SecurityProfile> {
    const req = this.client.make('GET', `/security/profiles/${tag}`)
      .set('Authorization', `Bearer ${this.appUserToken}`)
      .query({})
      .send();

    const res = await this.client.do(req);

    if (!isSecurityProfileResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async getProfiles({ page = 1, pageSize = 25 }: { page?: number, pageSize?: number }): Promise<SecurityProfile[]> {
    const req = this.client.make('GET', '/security/profiles')
      .set('Authorization', `Bearer ${this.appUserToken}`)
      .query({ page, 'page_size': pageSize, })
      .send();

    const res = await this.client.do(req);

    if (!isSecurityProfilesResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
