import { readFile, stat } from '@ionic/utils-fs';
import * as os from 'os';
import * as path from 'path';

import { IClient, IPaginator, PaginateArgs, PaginatorState, ResourceClientCreate, ResourceClientDelete, ResourceClientLoad, ResourceClientPaginate, Response, SSHKey } from '../definitions';
import { isSSHKeyListResponse, isSSHKeyResponse } from '../guards';

import { ResourceClient, createFatalAPIFormat } from './http';

export const ERROR_SSH_MISSING_PRIVKEY = 'SSH_MISSING_PRIVKEY';
export const ERROR_SSH_INVALID_PUBKEY = 'SSH_INVALID_PUBKEY';
export const ERROR_SSH_INVALID_PRIVKEY = 'SSH_INVALID_PRIVKEY';

export async function getGeneratedPrivateKeyPath(userId = 0): Promise<string> {
  return path.resolve(os.homedir(), '.ssh', 'ionic', String(userId));
}

export async function parsePublicKeyFile(pubkeyPath: string): Promise<[string, string, string, string]> {
  return parsePublicKey((await readFile(pubkeyPath, { encoding: 'utf8' })).trim());
}

/**
 * @return Promise<[full pubkey, algorithm, public numbers, annotation]>
 */
export async function parsePublicKey(pubkey: string): Promise<[string, string, string, string]> {
  const r = /^(ssh-[A-z0-9]+)\s([A-z0-9+\/=]+)\s?(.+)?$/.exec(pubkey);

  if (!r) {
    throw ERROR_SSH_INVALID_PUBKEY;
  }

  if (!r[3]) {
    r[3] = '';
  }

  r[1] = r[1].trim();
  r[2] = r[2].trim();
  r[3] = r[3].trim();

  return [pubkey, r[1], r[2], r[3]];
}

export async function validatePrivateKey(keyPath: string): Promise<void> {
  try {
    await stat(keyPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw ERROR_SSH_MISSING_PRIVKEY;
    }

    throw e;
  }

  const f = await readFile(keyPath, { encoding: 'utf8' });
  const lines = f.split('\n');

  if (!lines[0].match(/^\-{5}BEGIN [A-Z]+ PRIVATE KEY\-{5}$/)) {
    throw ERROR_SSH_INVALID_PRIVKEY;
  }
}

export interface SSHKeyClientDeps {
  readonly client: IClient;
  readonly token: string;
  readonly user: { id: number; };
}

export interface SSHKeyCreateDetails {
  pubkey: string;
}

export class SSHKeyClient extends ResourceClient implements ResourceClientLoad<SSHKey>, ResourceClientDelete, ResourceClientCreate<SSHKey, SSHKeyCreateDetails>, ResourceClientPaginate<SSHKey> {
  protected client: IClient;
  protected token: string;
  protected user: { id: number; };

  constructor({ client, token, user }: SSHKeyClientDeps) {
    super();
    this.client = client;
    this.token = token;
    this.user = user;
  }

  async create({ pubkey }: SSHKeyCreateDetails): Promise<SSHKey> {
    const { req } = await this.client.make('POST', `/users/${this.user.id}/sshkeys`);
    this.applyAuthentication(req, this.token);
    req.send({ pubkey });
    const res = await this.client.do(req);

    if (!isSSHKeyResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async load(id: string): Promise<SSHKey> {
    const { req } = await this.client.make('GET', `/users/${this.user.id}/sshkeys/${id}`);
    this.applyAuthentication(req, this.token);
    const res = await this.client.do(req);

    if (!isSSHKeyResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async delete(id: string): Promise<void> {
    const { req } = await this.client.make('DELETE', `/users/${this.user.id}/sshkeys/${id}`);
    this.applyAuthentication(req, this.token);
    await this.client.do(req);
  }

  paginate(args: Partial<PaginateArgs<Response<SSHKey[]>>> = {}): IPaginator<Response<SSHKey[]>, PaginatorState> {
    return this.client.paginate({
      reqgen: async () => {
        const { req } = await this.client.make('GET', `/users/${this.user.id}/sshkeys`);
        this.applyAuthentication(req, this.token);
        return { req };
      },
      guard: isSSHKeyListResponse,
    });
  }
}
