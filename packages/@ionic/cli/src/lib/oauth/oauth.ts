import { readFile } from '@ionic/utils-fs';
import { isPortAvailable } from '@ionic/utils-network';
import * as crypto from 'crypto';
import * as http from 'http';
import * as path from 'path';
import * as qs from 'querystring';
import { Response } from 'superagent';

import { ASSETS_DIRECTORY } from '../../constants';
import { ContentType, IClient, IConfig, OAuthServerConfig } from '../../definitions';
import { FatalException } from '../errors';
import { formatResponseError } from '../http';
import { openUrl } from '../open';

const REDIRECT_PORT = 8123;
const REDIRECT_HOST = 'localhost';

export interface AuthorizationParameters {
  [key: string]: string;
}

export interface TokenParameters {
  [key: string]: string;
}

export interface OAuth2FlowOptions {
  readonly redirectHost?: string;
  readonly redirectPort?: number;
  readonly accessTokenRequestContentType?: ContentType;
}

export interface OAuth2FlowDeps {
  readonly client: IClient;
  readonly config: IConfig;
}

export abstract class OAuth2Flow<T> {
  abstract readonly flowName: string;
  readonly oauthConfig: OAuthServerConfig;
  readonly redirectHost: string;
  readonly redirectPort: number;
  readonly accessTokenRequestContentType: ContentType;

  constructor({ redirectHost = REDIRECT_HOST, redirectPort = REDIRECT_PORT, accessTokenRequestContentType = ContentType.JSON }: OAuth2FlowOptions, readonly e: OAuth2FlowDeps) {
    this.oauthConfig = this.getAuthConfig();
    this.redirectHost = redirectHost;
    this.redirectPort = redirectPort;
    this.accessTokenRequestContentType = accessTokenRequestContentType;
  }

  get redirectUrl(): string {
    return `http://${this.redirectHost}:${this.redirectPort}`;
  }

  async run(): Promise<T> {
    const verifier = this.generateVerifier();
    const challenge = this.generateChallenge(verifier);

    const authorizationParams = this.generateAuthorizationParameters(challenge);
    const authorizationUrl = `${this.oauthConfig.authorizationUrl}?${qs.stringify(authorizationParams)}`;

    await openUrl(authorizationUrl);

    const authorizationCode = await this.getAuthorizationCode();
    const token = await this.exchangeAuthForAccessToken(authorizationCode, verifier);

    return token;
  }

  async exchangeRefreshToken(refreshToken: string): Promise<T> {
    const params = this.generateRefreshTokenParameters(refreshToken);
    const { req } = await this.e.client.make('POST', this.oauthConfig.tokenUrl, this.accessTokenRequestContentType);

    const res = await req.send(params);

    // check the response status code first here
    if (!res.ok) {
      throw new FatalException(
        'API request to refresh token was not successful.\n' +
        'Please try to login again.\n' +
        formatResponseError(req, res.status)
      );
    }

    if (!this.checkValidExchangeTokenRes(res)) {
      throw new FatalException(
        'API request was successful, but the refreshed token was unrecognized.\n' +
        'Please try to login again.\n'
      );
    }
    return res.body;
  }

  protected abstract generateAuthorizationParameters(challenge: string): AuthorizationParameters;
  protected abstract generateTokenParameters(authorizationCode: string, verifier: string): TokenParameters;
  protected abstract generateRefreshTokenParameters(refreshToken: string): TokenParameters;
  protected abstract checkValidExchangeTokenRes(res: Response): boolean;
  protected abstract getAuthConfig(): OAuthServerConfig;

  protected async getSuccessHtml(): Promise<string> {
    const p = path.resolve(ASSETS_DIRECTORY, 'oauth', 'success', 'index.html');
    const contents = await readFile(p, { encoding: 'utf8' });

    return contents;
  }

  protected async getAuthorizationCode(): Promise<string> {
    if (!(await isPortAvailable(this.redirectPort))) {
      throw new Error(`Cannot start local server. Port ${this.redirectPort} is in use.`);
    }

    const successHtml = await this.getSuccessHtml();

    return new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (req.url) {
          const params = qs.parse(req.url.substring(req.url.indexOf('?') + 1));

          if (params.code) {
            res.writeHead(200, { 'Content-Type': ContentType.HTML });
            res.end(successHtml);
            req.socket.destroy();
            server.close();

            resolve(Array.isArray(params.code) ? params.code[0] : params.code);
          }

          // TODO, timeout, error handling
        }
      });

      server.listen(this.redirectPort, this.redirectHost);
    });
  }

  protected async exchangeAuthForAccessToken(authorizationCode: string, verifier: string): Promise<T> {
    const params = this.generateTokenParameters(authorizationCode, verifier);
    const { req } = await this.e.client.make('POST', this.oauthConfig.tokenUrl, this.accessTokenRequestContentType);

    const res = await req.send(params);
    if (!this.checkValidExchangeTokenRes(res)) {
      throw new FatalException(
        'API request was successful, but the response format was unrecognized.\n' +
        formatResponseError(req, res.status)
      );
    }
    return res.body;
  }

  protected generateVerifier(): string {
    return this.base64URLEncode(crypto.randomBytes(32));
  }

  protected generateChallenge(verifier: string): string {
    return this.base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
  }

  protected base64URLEncode(buffer: Buffer) {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
