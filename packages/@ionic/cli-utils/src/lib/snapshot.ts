import {
  IClient,
  IPaginator,
  ResourceClient,
  Response,
  Snapshot,
} from '../definitions';

import { isSnapshotListResponse, isSnapshotResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export interface SnapshotClientDeps {
  readonly client: IClient;
  readonly token: string;
  readonly app: { id: string; };
}

export class SnapshotClient implements ResourceClient<Snapshot, never> {
  protected client: IClient;
  protected token: string;
  protected app: { id: string; };

  constructor({ client, app, token }: SnapshotClientDeps) {
    this.client = client;
    this.token = token;
    this.app = app;
  }

  async load(id: string): Promise<Snapshot> {
    const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots/${id}`);
    req.set('Authorization', `Bearer ${this.token}`);
    const res = await this.client.do(req);

    if (!isSnapshotResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  paginate(): IPaginator<Response<Snapshot[]>> {
    return this.client.paginate(
      async () => {
        const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots`);
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      isSnapshotListResponse
    );
  }

}
