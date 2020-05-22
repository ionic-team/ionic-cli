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
    this.e.config.unset('tokens.refresh');
    this.e.config.unset('tokens.expiresInSeconds');
    this.e.config.unset('tokens.issuedOn');
    this.e.config.unset('tokens.flowName');
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
}

export class ProSession extends BaseSession implements ISession {

  async getUserToken(): Promise<string> {
    let userToken = this.e.config.get('tokens.user');

    if (!userToken) {
      throw new SessionException(
        `Oops, sorry! You'll need to log in:\n    ${input('ionic login')}\n\n` +
        `You can create a new account by signing up:\n\n    ${input('ionic signup')}\n`
      );
    }

    const tokenIssuedOn = this.e.config.get('tokens.issuedOn');
    const tokenExpirationSeconds = this.e.config.get('tokens.expiresInSeconds');
    const refreshToken = this.e.config.get('tokens.refresh');
    const flowName = this.e.config.get('tokens.flowName');

    // if there is the possibility to refresh the token, try to do it
    if (tokenIssuedOn && tokenExpirationSeconds && refreshToken && flowName) {
      if (!this.isTokenValid(tokenIssuedOn, tokenExpirationSeconds)) {
        userToken = await this.refreshLogin(refreshToken, flowName);
      }
    }

    // otherwise simply return the token
    return userToken;
  }

  private isTokenValid(tokenIssuedOn: string, tokenExpirationSeconds: number): boolean {
    const tokenExpirationMilliSeconds = tokenExpirationSeconds * 1000;
    // 15 minutes in milliseconds of margin
    const marginExpiration = 15 * 60 * 1000;
    const tokenValid = new Date() < new Date(new Date(tokenIssuedOn).getTime() + tokenExpirationMilliSeconds - marginExpiration);
    return tokenValid;
  }

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

  async ssoLogin(email?: string): Promise<void> {
    await this.webLogin();
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
    const { OpenIDFlow } = await import('./oauth/openid');
    const flow = new OpenIDFlow({ audience: this.e.config.get('urls.api') }, this.e);
    const token = await flow.run();

    await this.tokenLogin(token.access_token);

    this.e.config.set('tokens.refresh', token.refresh_token);
    this.e.config.set('tokens.expiresInSeconds', token.expires_in);
    this.e.config.set('tokens.issuedOn', (new Date()).toJSON());
    this.e.config.set('tokens.flowName', flow.flowName);
  }

  async refreshLogin(refreshToken: string, flowName: string): Promise<string> {
    let oauthflow;
    // having a generic way to access the right refresh token flow
    switch (flowName) {
      case 'open_id':
        const { OpenIDFlow } = await import('./oauth/openid');
        oauthflow = new OpenIDFlow({ audience: this.e.config.get('urls.api') }, this.e);
        break;
      default:
        oauthflow = undefined;
    }
    if (!oauthflow) {
      throw new FatalException('Token cannot be refreshed');
    }

    const token = await oauthflow.exchangeRefreshToken(refreshToken);
    await this.tokenLogin(token.access_token);
    this.e.config.set('tokens.expiresInSeconds', token.expires_in);
    this.e.config.set('tokens.issuedOn', (new Date()).toJSON());

    return token.access_token;
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
