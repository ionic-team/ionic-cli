import chalk from 'chalk';

import {
  IClient,
  IConfig,
  IProject,
  ISession,
  IonicEnvironment,
} from '../definitions';

import { isAuthTokensResponse, isLegacyLoginResponse, isProLoginResponse, isSuperAgentError } from '../guards';

import { FatalException } from './errors';
import { createFatalAPIFormat } from './http';

export class BaseSession {
  constructor(
    protected config: IConfig,
    protected project: IProject,
    protected client: IClient
  ) {}

  async isLoggedIn(): Promise<boolean> {
    const c = await this.config.load();
    return typeof c.tokens.user === 'string';
  }

  async logout(): Promise<void> {
    const c = await this.config.load();

    c.user = {};
    c.tokens.appUser = {};
    delete c.tokens.user;
    c.git.setup = false;
  }

  async getUserToken(): Promise<string> {
    const c = await this.config.load();

    if (!c.tokens.user) {
      throw new FatalException(
        `Oops, sorry! You'll need to log in:\n    ${chalk.green('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`
      );
    }

    return c.tokens.user;
  }
}

export class CloudSession extends BaseSession implements ISession {
  async login(email: string, password: string): Promise<void> {
    const { req } = await this.client.make('POST', '/login');
    req.send({ email, password });

    try {
      const res = await this.client.do(req);

      if (!isLegacyLoginResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      const { token, user_id } = res.data;
      const c = await this.config.load();

      if (c.user.id !== user_id) { // User changed
        await this.logout();
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

  async getAppUserToken(app_id?: string): Promise<string> {
    if (!app_id) {
      app_id = await this.project.loadAppId();
    }

    const c = await this.config.load();

    if (!c.tokens.appUser[app_id]) {
      const token = await this.getUserToken();
      const paginator = await this.client.paginate(
        async () => {
          const { req } = await this.client.make('GET', '/auth/tokens');
          req.set('Authorization', `Bearer ${token}`).query({ 'page_size': 100, type: 'app-user' });
          return { req };
        },
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

export class ProSession extends BaseSession implements ISession {
  async login(email: string, password: string): Promise<void> {
    const { req } = await this.client.make('POST', '/login');
    req.send({ email, password, source: 'cli' });

    try {
      const res = await this.client.do(req);

      if (!isProLoginResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      const { token, user } = res.data;
      const c = await this.config.load();

      const user_id = String(user.id);

      if (c.user.id !== user_id) { // User changed
        await this.logout();
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

  async getAppUserToken(app_id?: string): Promise<string> {
    return this.getUserToken();
  }
}

export async function promptToLogin(env: IonicEnvironment): Promise<void> {
  const { validators } = await import('@ionic/cli-framework/lib');

  env.log.msg(`Log into your Ionic account\nIf you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);

  const email = await env.prompt({
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: v => validators.email(v),
  });

  const password = await env.prompt({
    type: 'password',
    name: 'password',
    message: 'Password:'
  });

  await env.session.login(email, password);
}
