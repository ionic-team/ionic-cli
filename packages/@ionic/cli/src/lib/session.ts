import { combine } from '@ionic/cli-framework';

import { IClient, IConfig, ISession, IonicEnvironment } from '../definitions';
import { isLoginResponse, isSuperAgentError } from '../guards';

import { input } from './color';
import { FatalException, SessionException } from './errors';
import { formatResponseError } from './http';
import { openUrl } from './open';

export interface SessionDeps {
  readonly config: IConfig;
  readonly client: IClient;
}

export class BaseSession {
  constructor(readonly e: SessionDeps) {}

  async logout(): Promise<void> {
    this.e.config.unset('org.id');
    this.e.config.unset('user.id');
    this.e.config.unset('user.email');
    this.e.config.unset('tokens.user');
    this.e.config.set('git.setup', false);
  }

  isLoggedIn(): boolean {
    return typeof this.e.config.get('tokens.user') === 'string';
  }

  getUser(): { id: number; } {
    const userId = this.e.config.get('user.id');

    if (!userId) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${input('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${input('ionic signup')}\n`
      );
    }

    return { id: userId };
  }

  getUserToken(): string {
    const userToken = this.e.config.get('tokens.user');

    if (!userToken) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${input('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${input('ionic signup')}\n`
      );
    }

    return userToken;
  }
}

export class ProSession extends BaseSession implements ISession {
  async login(email: string, password: string): Promise<void> {
    const { req } = await this.e.client.make('POST', '/login');
    req.send({ email, password, source: 'cli' });

    try {
      const res = await this.e.client.do(req);

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

      if (this.e.config.get('user.id') !== user.id) { // User changed
        await this.logout();
      }

      this.e.config.set('user.id', user.id);
      this.e.config.set('user.email', email);
      this.e.config.set('tokens.user', token);
    } catch (e) {
      if (isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
        throw new SessionException('Incorrect email or password.');
      }

      throw e;
    }
  }

  async ssoLogin(email: string): Promise<void> {
    const { AuthClient } = await import('./oauth/auth');
    const { Auth0OAuth2Flow } = await import('./oauth/sso');

    const authClient = new AuthClient(this.e);
    const { uuid: connection } = await authClient.connections.load(email);

    const flow = new Auth0OAuth2Flow({ audience: this.e.config.get('urls.api'), email, connection }, this.e);
    const token = await flow.run();

    await this.tokenLogin(token);

    this.e.config.set('org.id', connection);
  }

  async tokenLogin(token: string): Promise<void> {
    const { UserClient } = await import('./user');

    const userClient = new UserClient(token, this.e);

    try {
      const user = await userClient.loadSelf();
      const user_id = user.id;

      if (this.e.config.get('user.id') !== user_id) { // User changed
        await this.logout();
      }

      this.e.config.set('user.id', user_id);
      this.e.config.set('user.email', user.email);
      this.e.config.set('tokens.user', token);
    } catch (e) {
      if (isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
        throw new SessionException('Invalid auth token.');
      }

      throw e;
    }
  }

  async webLogin(): Promise<void> {
    const { OpenIDFlow } = await import('./oauth/login-web');
    const flow = new OpenIDFlow({ audience: this.e.config.get('urls.api') }, this.e);
    const token = await flow.run();
    await this.tokenLogin(token);
  }
}

export async function promptToLogin(env: IonicEnvironment): Promise<void> {
  const { validators } = await import('@ionic/cli-framework');

  env.log.nl();
  env.log.msg(
    `Log in to your Ionic account!\n` +
    `If you don't have one yet, create yours by running: ${input(`ionic signup`)}\n`
  );

  const email = await env.prompt({
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: v => combine(validators.required, validators.email)(v),
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

export async function promptToSignup(env: IonicEnvironment): Promise<void> {
  env.log.nl();
  env.log.msg(
    `Join the Ionic Community! 💙\n` +
    `Connect with millions of developers on the Ionic Forum and get access to live events, news updates, and more.\n\n`
  );

  const create = await env.prompt({
    type: 'confirm',
    name: 'create',
    message: 'Create free Ionic account?',
    default: false,
  });

  if (create) {
    const dashUrl = env.config.getDashUrl();

    await openUrl(`${dashUrl}/signup?source=cli`);
  }
}

function hasTokenAttribute(r: any): r is { token: string; } {
  return r && typeof r === 'object' && typeof r.token === 'string';
}
