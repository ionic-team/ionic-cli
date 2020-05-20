import { ContentTypes } from '../../definitions';

import {
  AuthorizationParameters,
  OAuth2Flow,
  OAuth2FlowDeps,
  OAuth2FlowOptions,
  TokenParameters
} from './sso';

const AUTHORIZATION_URL = 'https://staging.ionicframework.com/oauth/authorize';
const TOKEN_URL = 'https://api-staging.ionicjs.com/oauth/token';
const CLIENT_ID = 'cli';
const API_AUDIENCE = 'https://api.ionicjs.com';

export interface OpenIDFlowOptions extends Partial<OAuth2FlowOptions> {
  readonly audience?: string;
  readonly accessTokenRequestContentType?: ContentTypes;
}

export class OpenIDFlow extends OAuth2Flow {
  readonly audience: string;

  constructor({ audience = API_AUDIENCE, accessTokenRequestContentType = ContentTypes.formUrlencoded, authorizationUrl = AUTHORIZATION_URL, tokenUrl = TOKEN_URL, clientId = CLIENT_ID, ...options }: OpenIDFlowOptions, readonly e: OAuth2FlowDeps) {
    super({ authorizationUrl, tokenUrl, clientId, accessTokenRequestContentType, ...options }, e);
    this.audience = audience;
  }

  protected generateAuthorizationParameters(challenge: string): AuthorizationParameters {
    return {
      audience: this.audience,
      scope: 'openid profile email offline_access',
      response_type: 'code',
      client_id: this.clientId,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: this.redirectUrl,
      nonce: this.generateVerifier(),
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
}
