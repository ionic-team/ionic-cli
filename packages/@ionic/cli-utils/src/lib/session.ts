import chalk from 'chalk';

import { IClient, IConfig, IProject, ISession, IonicEnvironment } from '../definitions';
import { isLoginResponse, isSuperAgentError } from '../guards';

import { FatalException, SessionException } from './errors';
import { formatResponseError } from './http';

export class SessionDeps {
  readonly config: IConfig;
  readonly client: IClient;
  readonly project?: IProject;
}

export class BaseSession {
  protected config: IConfig;
  protected client: IClient;
  protected project?: IProject;

  constructor({ config, client, project }: SessionDeps) {
    this.config = config;
    this.client = client;
    this.project = project;
  }

  async isLoggedIn(): Promise<boolean> {
    const c = await this.config.load();
    return typeof c.tokens.user === 'string';
  }

  async logout(): Promise<void> {
    const c = await this.config.load();

    c.user = {};
    delete c.tokens.user;
    c.git.setup = false;
  }

  async getUser(): Promise<{ id: number; }> {
    const c = await this.config.load();

    if (!c.user.id) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${chalk.green('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${chalk.green('ionic signup')}\n`
      );
    }

    return { id: c.user.id };
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
      const c = await this.config.load();

      const user_id = user.id;

      if (c.user.id !== user_id) { // User changed
        await this.logout();
      }

      c.user.id = user_id;
      c.user.email = email;
      c.tokens.user = token;
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
    const c = await this.config.load();

    try {
      const user = await userClient.loadSelf();
      const user_id = user.id;

      if (c.user.id !== user_id) { // User changed
        await this.logout();
      }

      c.user.id = user_id;
      c.user.email = user.email;
      c.tokens.user = token;
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
  const res = <any>r;
  return res && typeof res === 'object' && typeof res.token === 'string';
}
