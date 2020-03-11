import { GithubBranch, GithubRepo, IClient, IPaginator, ResourceClientLoad, ResourceClientRequestModifiers, Response, TokenPaginatorState, User } from '../definitions';
import { isGithubBranchListResponse, isGithubRepoListResponse, isOAuthLoginResponse, isUserResponse } from '../guards';

import { ResourceClient, TokenPaginator, createFatalAPIFormat } from './http';

export interface UserClientDeps {
  readonly client: IClient;
}

export class UserClient extends ResourceClient implements ResourceClientLoad<User> {
  constructor(readonly token: string, readonly e: UserClientDeps) {
    super();
  }

  async load(id: number, modifiers?: ResourceClientRequestModifiers): Promise<User> {
    const { req } = await this.e.client.make('GET', `/users/${id}`);
    this.applyAuthentication(req, this.token);
    this.applyModifiers(req, modifiers);
    const res = await this.e.client.do(req);

    if (!isUserResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async loadSelf(): Promise<User> {
    const { req } = await this.e.client.make('GET', '/users/self');
    this.applyAuthentication(req, this.token);
    const res = await this.e.client.do(req);

    if (!isUserResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async oAuthGithubLogin(id: number): Promise<string> {
    const { req } = await this.e.client.make('POST', `/users/${id}/oauth/github`);
    this.applyAuthentication(req, this.token);
    req.send({ source: 'cli' });

    const res = await this.e.client.do(req);

    if (!isOAuthLoginResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data.redirect_url;
  }

  paginateGithubRepositories(id: number): IPaginator<Response<GithubRepo[]>, TokenPaginatorState> {
    return new TokenPaginator({
      client: this.e.client,
      reqgen: async () => {
        const { req } = await this.e.client.make('GET', `/users/${id}/oauth/github/repositories`);
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      guard: isGithubRepoListResponse,
    });
  }

  paginateGithubBranches(userId: number, repoId: number): IPaginator<Response<GithubBranch[]>, TokenPaginatorState> {
    return new TokenPaginator({
      client: this.e.client,
      reqgen: async () => {
        const { req } = await this.e.client.make('GET', `/users/${userId}/oauth/github/repositories/${repoId}/branches`);
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      guard: isGithubBranchListResponse,
    });
  }
}
