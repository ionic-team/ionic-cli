import chalk from 'chalk';

import { IClient, IConfig, ISession, IonicEnvironment } from '../definitions';
import { isLoginResponse, isSuperAgentError } from '../guards';

import { FatalException, SessionException } from './errors';
import { formatResponseError } from './http';

export interface SessionDeps {
  readonly config: IConfig;
  readonly client: IClient;
}

export class BaseSession {
  protected config: IConfig;
  protected client: IClient;

  constructor({ config, client }: SessionDeps) {
    this.config = config;
    this.client = client;
  }

  async logout(): Promise<void> {
    this.config.unset('user.id');
    this.config.unset('user.email');
    this.config.unset('tokens.user');
    this.config.set('git.setup', false);
  }

  isLoggedIn(): boolean {
    return typeof this.config.get('tokens.user') === 'string';
  }

  getUser(): { id: number; } {
    const userId = this.config.get('user.id');

    if (!userId) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${chalk.green('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`
      );
    }

    return { id: userId };
  }

  getUserToken(): string {
    const userToken = this.config.get('tokens.user');

    if (!userToken) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${chalk.green('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`
      );
    }

    return userToken;
  }
}

export class ProSession extends BaseSession implements ISession {
  async login(email: string, password: string): Promise<void> {
    const { req } = await this.client.make('POST', '/login');
    req.send({ email, password, source: 'cli' });

    try {
      const res = await this.client.do(req);

      if (!isLoginResponse(res)) {
        const data = res.data;

        if (hasTokenAttribute(data)) {
          data.token = '*****';
        }

        throw new FatalException(
          'API request was successful, but the response format was unrecognized.\n' +
          formatResponseError(req, res.meta.status, data)
        );
      }

      const { token, user } = res.data;

      if (this.config.get('user.id') !== user.id) { // User changed
        await this.logout();
      }

      this.config.set('user.id', user.id);
      this.config.set('user.email', email);
      this.config.set('tokens.user', token);
    } catch (e) {
      if (isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
        throw new SessionException('Incorrect email or password.');
      }

      throw e;
    }
  }

  async tokenLogin(token: string) {
    const { UserClient } = await import('./user');

    const userClient = new UserClient({ client: this.client, token });

    try {
      const user = await userClient.loadSelf();
      const user_id = user.id;

      if (this.config.get('user.id') !== user_id) { // User changed
        await this.logout();
      }

      this.config.set('user.id', user_id);
      this.config.set('user.email', user.email);
      this.config.set('tokens.user', token);
    } catch (e) {
      if (isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
        throw new SessionException('Invalid auth token.');
      }

      throw e;
    }
  }
}

export async function promptToLogin(env: IonicEnvironment): Promise<void> {
  const { validators } = await import('@ionic/cli-framework');

  env.log.msg(
    `Log into your Ionic Pro account\n` +
    `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`
  );

  const email = await env.prompt({
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: v => validators.required(v) && validators.email(v),
  });

  const password = await env.prompt({
    type: 'password',
    name: 'password',
    message: 'Password:',
    mask: '*',
    validate: v => validators.required(v),
  });

  await env.session.login(email, password);
}

function hasTokenAttribute(r: any): r is { token: string; } {
  return r && typeof r === 'object' && typeof r.token === 'string';
}
