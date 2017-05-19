import * as chalk from 'chalk';

import {
  ConfigFile,
  IClient,
  IConfig,
  IProject,
  ISession,
} from '../definitions';

import { isAuthTokensResponse, isLoginResponse, isSuperAgentError } from '../guards';

import { FatalException } from './errors';
import { createFatalAPIFormat } from './http';

export class Session implements ISession {
  constructor(
    protected config: IConfig<ConfigFile>,
    protected project: IProject,
    protected client: IClient
  ) {}

  async login(email: string, password: string): Promise<void> {
    const req = this.client.make('POST', '/login')
      .send({ email, password });

    try {
      const res = await this.client.do(req);

      if (!isLoginResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      const { token, user_id } = res.data;
      const c = await this.config.load();

      if (c.user.id !== user_id) { // User changed
        c.tokens.appUser = {};
      }

      c.user.id = user_id;
      c.user.email = email;
      c.tokens.user = token;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 401) {
        throw new FatalException(chalk.red('Incorrect email or password'));
      }

      throw e;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const c = await this.config.load();
    return typeof c.tokens.user === 'string';
  }

  async getUserToken(): Promise<string> {
    const c = await this.config.load();

    if (!c.tokens.user) {
      throw new FatalException(`Oops, sorry! You'll need to log in:\n\n    ${chalk.green('ionic login')}\n\n` +
                               `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`);
    }

    return c.tokens.user;
  }

  async getAppUserToken(app_id?: string): Promise<string> {
    if (!app_id) {
      app_id = await this.project.loadAppId();
    }

    const c = await this.config.load();

    if (!c.tokens.appUser[app_id]) {
      const token = await this.getUserToken();
      const paginator = this.client.paginate(
        () => this.client.make('GET', '/auth/tokens').set('Authorization', `Bearer ${token}`).query({ 'page_size': 100, type: 'app-user' }),
        isAuthTokensResponse
      );

      for (let r of paginator) {
        const res = await r;

        for (let token of res.data) {
          c.tokens.appUser[token.details.app_id] = token.token;
        }
      }
    }

    // TODO: if this is a new app, an app-user token may not exist for the user
    // TODO: if tokens are invalidated, what do (hint: app tokens)

    if (!c.tokens.appUser[app_id]) {
      throw new FatalException(`A token does not exist for your account on app ${chalk.bold(app_id)}.`);
    }

    return c.tokens.appUser[app_id];
  }
}
