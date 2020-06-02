import { Response } from 'superagent';

import { ContentType, OAuthServerConfig, OpenIdToken } from '../../definitions';
import { isOpenIDTokenExchangeResponse } from '../../guards';

import {
  AuthorizationParameters,
  OAuth2Flow,
  OAuth2FlowDeps,
  OAuth2FlowOptions,
  TokenParameters
} from './oauth';

export interface OpenIDFlowOptions extends Partial<OAuth2FlowOptions> {
  readonly accessTokenRequestContentType?: ContentType;
}

export class OpenIDFlow extends OAuth2Flow<OpenIdToken> {
  readonly flowName = 'open_id';

  constructor({ accessTokenRequestContentType = ContentType.FORM_URLENCODED, ...options }: OpenIDFlowOptions, readonly e: OAuth2FlowDeps) {
    super({ accessTokenRequestContentType, ...options }, e);
  }

  protected generateAuthorizationParameters(challenge: string): AuthorizationParameters {
    return {
      audience: this.oauthConfig.apiAudience,
      scope: 'openid profile email offline_access',
      response_type: 'code',
      client_id: this.oauthConfig.clientId,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: this.redirectUrl,
      nonce: this.generateVerifier(),
    };
  }

  protected generateTokenParameters(code: string, verifier: string): TokenParameters {
    return {
      grant_type: 'authorization_code',
      client_id: this.oauthConfig.clientId,
      code_verifier: verifier,
      code,
      redirect_uri: this.redirectUrl,
    };
  }

  protected generateRefreshTokenParameters(refreshToken: string): TokenParameters {
    return {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: this.oauthConfig.clientId,
    };
  }

  protected checkValidExchangeTokenRes(res: Response): boolean {
    return isOpenIDTokenExchangeResponse(res);
  }

  protected getAuthConfig(): OAuthServerConfig {
    return this.e.config.getOpenIDOAuthConfig();
  }

}
