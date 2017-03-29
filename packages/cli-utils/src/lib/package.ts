import { IClient, PackageBuild } from '../definitions';
import { isPackageBuildsResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export class PackageClient {
  constructor(protected appUserToken: string, protected client: IClient) {}

  async getBuilds(): Promise<PackageBuild[]> {
    const req = this.client.make('GET', `/package/builds`)
      .set('Authorization', `Bearer ${this.appUserToken}`)
      .send();

    const res = await this.client.do(req);

    if (!isPackageBuildsResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

}
