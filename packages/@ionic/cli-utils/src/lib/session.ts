import chalk from 'chalk';

import {
  IClient,
  IConfig,
  IProject,
  ISession,
  IonicEnvironment,
} from '../definitions';

import { isLoginResponse, isSuperAgentError } from '../guards';

import { SessionException } from './errors';
import { createFatalAPIFormat } from './http';

export class BaseSession {
  constructor(
    protected config: IConfig,
    protected client: IClient,
    protected project?: IProject
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
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${chalk.green('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`
      );
    }

    return c.tokens.user;
  }
}

export class ProSession extends BaseSession implements ISession {
  async login(email: string, password: string): Promise<void> {
    const { req } = await this.client.make('POST', '/login');
    req.send({ email, password, source: 'cli' });

    try {
      const res = await this.client.do(req);

      if (!isLoginResponse(res)) {
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
        throw new SessionException('Incorrect email or password.');
      }

      throw e;
    }
  }
}

export async function promptToLogin(env: IonicEnvironment): Promise<void> {
  const { validators } = await import('@ionic/cli-framework');

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
    message: 'Password:',
  });

  await env.session.login(email, password);
}
