import { Response } from 'superagent';

import {
  AuthorizationParameters,
  OAuth2Flow,
  OAuth2FlowDeps,
  OAuth2FlowOptions,
  TokenParameters
} from './oauth';

const AUTHORIZATION_URL = 'https://auth.ionicframework.com/authorize';
const TOKEN_URL = 'https://auth.ionicframework.com/oauth/token';
const CLIENT_ID = '0kTF4wm74vppjImr11peCjQo2PIQDS3m';
const API_AUDIENCE = 'https://api.ionicjs.com';

export interface Auth0OAuth2FlowOptions extends Partial<OAuth2FlowOptions> {
  readonly email: string;
  readonly connection: string;
  readonly audience?: string;
}

export class Auth0OAuth2Flow extends OAuth2Flow<any> {
  readonly flowName = 'sso';
  readonly email: string;
  readonly audience: string;
  readonly connection: string;

  constructor({ email, connection, audience = API_AUDIENCE, authorizationUrl = AUTHORIZATION_URL, tokenUrl = TOKEN_URL, clientId = CLIENT_ID, ...options }: Auth0OAuth2FlowOptions, readonly e: OAuth2FlowDeps) {
    super({ authorizationUrl, tokenUrl, clientId, ...options }, e);
    this.email = email;
    this.connection = connection;
    this.audience = audience;
  }

  protected generateAuthorizationParameters(challenge: string): AuthorizationParameters {
    return {
      audience: this.audience,
      scope: 'openid profile email offline_access',
      response_type: 'code',
      connection: this.connection,
      client_id: this.clientId,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: this.redirectUrl,
    };
  }

  protected generateTokenParameters(code: string, verifier: string): TokenParameters {
    return {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code_verifier: verifier,
      code,
      redirect_uri: this.redirectUrl,
    };
  }

  protected generateRefreshTokenParameters(refreshToken: string): TokenParameters {
    return {};
  }

  protected checkValidExchangeTokenRes(res: Response): boolean {
    return true;
  }

}
