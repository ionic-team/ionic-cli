import { readFile } from '@ionic/utils-fs';
import { isPortAvailable } from '@ionic/utils-network';
import * as crypto from 'crypto';
import * as http from 'http';
import * as path from 'path';
import * as qs from 'querystring';

import { ASSETS_DIRECTORY } from '../constants';
import { ContentTypes, IClient } from '../definitions';

import { openUrl } from './open';

const REDIRECT_PORT = 8123;
const REDIRECT_HOST = 'localhost';

export interface AuthorizationParameters {
  [key: string]: string;
}

export interface TokenParameters {
  [key: string]: string;
}

export interface OAuth2FlowOptions {
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly clientId: string;
  readonly redirectHost?: string;
  readonly redirectPort?: number;
  readonly accessTokenRequestContentType?: ContentTypes;
}

export interface OAuth2FlowDeps {
  readonly client: IClient;
}

export abstract class OAuth2Flow {
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly clientId: string;
  readonly redirectHost: string;
  readonly redirectPort: number;
  readonly accessTokenRequestContentType: ContentTypes;

  constructor({ authorizationUrl, tokenUrl, clientId, redirectHost = REDIRECT_HOST, redirectPort = REDIRECT_PORT, accessTokenRequestContentType = ContentTypes.json }: OAuth2FlowOptions, readonly e: OAuth2FlowDeps) {
    this.authorizationUrl = authorizationUrl;
    this.tokenUrl = tokenUrl;
    this.clientId = clientId;
    this.redirectHost = redirectHost;
    this.redirectPort = redirectPort;
    this.accessTokenRequestContentType = accessTokenRequestContentType;
  }

  get redirectUrl(): string {
    return `http://${this.redirectHost}:${this.redirectPort}`;
  }

  async run(): Promise<string> {
    const verifier = this.generateVerifier();
    const challenge = this.generateChallenge(verifier);

    const authorizationParams = this.generateAuthorizationParameters(challenge);
    const authorizationUrl = `${this.authorizationUrl}?${qs.stringify(authorizationParams)}`;

    await openUrl(authorizationUrl);

    const authorizationCode = await this.getAuthorizationCode();
    const token = await this.getAccessToken(authorizationCode, verifier);

    return token;
  }

  protected abstract generateAuthorizationParameters(challenge: string): AuthorizationParameters;
  protected abstract generateTokenParameters(authorizationCode: string, verifier: string): TokenParameters;

  protected async getSuccessHtml(): Promise<string> {
    const p = path.resolve(ASSETS_DIRECTORY, 'sso', 'success', 'index.html');
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
            res.writeHead(200, { 'Content-Type': ContentTypes.html });
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

  protected async getAccessToken(authorizationCode: string, verifier: string): Promise<string> {
    const params = this.generateTokenParameters(authorizationCode, verifier);
    const { req } = await this.e.client.make('POST', this.tokenUrl, this.accessTokenRequestContentType);
    const res = await req.send(params);

    return res.body.access_token;
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

const AUTHORIZATION_URL = 'https://auth.ionicframework.com/authorize';
const TOKEN_URL = 'https://auth.ionicframework.com/oauth/token';
const CLIENT_ID = '0kTF4wm74vppjImr11peCjQo2PIQDS3m';
const API_AUDIENCE = 'https://api.ionicjs.com';

export interface Auth0OAuth2FlowOptions extends Partial<OAuth2FlowOptions> {
  readonly email: string;
  readonly connection: string;
  readonly audience?: string;
}

export class Auth0OAuth2Flow extends OAuth2Flow {
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
}
