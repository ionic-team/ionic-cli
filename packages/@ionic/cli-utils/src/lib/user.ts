import { GithubRepo, IClient, IPaginator, ResourceClientLoad, ResourceClientRequestModifiers, Response, TokenPaginatorState, User } from '../definitions';
import { isGithubRepoListResponse, isOAuthLoginResponse, isUserResponse } from '../guards';
import { ResourceClient, TokenPaginator, createFatalAPIFormat } from './http';

export interface UserClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class UserClient extends ResourceClient implements ResourceClientLoad<User> {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: UserClientDeps) {
    super();
    this.client = client;
    this.token = token;
  }

  async load(id: number, modifiers?: ResourceClientRequestModifiers): Promise<User> {
    const { req } = await this.client.make('GET', `/users/${id}`);
    this.applyAuthentication(req, this.token);
    this.applyModifiers(req, modifiers);
    const res = await this.client.do(req);

    if (!isUserResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async loadSelf(): Promise<User> {
    const { req } = await this.client.make('GET', '/users/self');
    this.applyAuthentication(req, this.token);
    const res = await this.client.do(req);

    if (!isUserResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async oAuthGithubLogin(id: number): Promise<string> {
    const { req } = await this.client.make('POST', `/users/${id}/oauth/github`);
    this.applyAuthentication(req, this.token);
    req.send({});

    const res = await this.client.do(req);

    if (!isOAuthLoginResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data.redirect_url;
  }

  paginateGithubRepositories(id: number): IPaginator<Response<GithubRepo[]>, TokenPaginatorState> {
    return new TokenPaginator({
      client: this.client,
      reqgen: async () => {
        const { req } = await this.client.make('GET', `/users/${id}/oauth/github/repositories`);
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      guard: isGithubRepoListResponse,
    });
  }
}
