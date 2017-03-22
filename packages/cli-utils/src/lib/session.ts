import * as chalk from 'chalk';

import {
  ConfigFile,
  IClient,
  IConfig,
  IProject,
  ISession
} from '../definitions';

import { isAuthTokenResponse, isLoginResponse } from '../guards';

import { FatalException } from './errors';
import { createFatalAPIFormat } from './http';

export class Session implements ISession {
  constructor(
    protected config: IConfig<ConfigFile>,
    protected project: IProject,
    protected client: IClient
  ) {}

  async login(email: string, password: string): Promise<void> {
    let req = this.client.make('POST', '/login')
      .send({ email, password });

    let res = await this.client.do(req);

    if (!isLoginResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    let c = await this.config.load();

    if (c.tokens.user !== res.data.token) {
      c.tokens.user = res.data.token;

      // User token changed, so the user may have changed. Wipe out other tokens!
      c.tokens.appUser = {};
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const c = await this.config.load();
    return !!c.tokens.user;
  }

  async getUserToken(): Promise<string> {
    const c = await this.config.load();

    if (!c.tokens.user) {
      throw new FatalException(`You are not logged in! Run '${chalk.bold('ionic login')}'.`);
    }

    return c.tokens.user;
  }

  async getAppUserToken(app_id?: string): Promise<string> {
    if (!app_id) {
      app_id = await this.project.loadAppId();
    }

    const c = await this.config.load();

    if (!c.tokens.appUser[app_id]) {
      const req = this.client.make('GET', '/auth/tokens')
        .set('Authorization', `Bearer ${await this.getUserToken()}`)
        .query({ type: 'app-user' })
        .send();

      const res = await this.client.do(req);

      if (!isAuthTokenResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      // TODO: pagination
      for (let token of res.data) {
        c.tokens.appUser[token.details.app_id] = token.token;
      }
    }

    // TODO: if this is a new app, an app-user token may not exist for the user
    // TODO: if tokens are invalidated, what do (hint: app tokens)

    if (!c.tokens.appUser[app_id]) {
      throw new FatalException(`A token does not exist for your account on App '${app_id}'.`);
    }

    return c.tokens.appUser[app_id];
  }
}
