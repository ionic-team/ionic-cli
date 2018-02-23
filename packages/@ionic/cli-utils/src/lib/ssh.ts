import * as os from 'os';
import * as path from 'path';

import { ERROR_FILE_NOT_FOUND, fsReadFile, fsStat } from '@ionic/cli-framework/utils/fs';

import { IClient, IPaginator, Response, SSHKey } from '../definitions';
import { isSSHKeyListResponse } from '../guards';

export const ERROR_SSH_MISSING_PRIVKEY = 'SSH_MISSING_PRIVKEY';
export const ERROR_SSH_INVALID_PUBKEY = 'SSH_INVALID_PUBKEY';
export const ERROR_SSH_INVALID_PRIVKEY = 'SSH_INVALID_PRIVKEY';

export async function getGeneratedPrivateKeyPath(userId = 'anonymous'): Promise<string> {
  return path.resolve(os.homedir(), '.ssh', 'ionic', userId);
}

export async function parsePublicKeyFile(pubkeyPath: string): Promise<[string, string, string, string]> {
  try {
    await fsStat(pubkeyPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw ERROR_FILE_NOT_FOUND;
    }

    throw e;
  }

  return parsePublicKey((await fsReadFile(pubkeyPath, { encoding: 'utf8' })).trim());
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
    await fsStat(keyPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw ERROR_SSH_MISSING_PRIVKEY;
    }

    throw e;
  }

  const f = await fsReadFile(keyPath, { encoding: 'utf8' });
  const lines = f.split('\n');

  if (!lines[0].match(/^\-{5}BEGIN [R|D]SA PRIVATE KEY\-{5}$/)) {
    throw ERROR_SSH_INVALID_PRIVKEY;
  }
}

export interface SSHKeyClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class SSHKeyClient {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: SSHKeyClientDeps) {
    this.client = client;
    this.token = token;
  }

  async paginate(userId: string): Promise<IPaginator<Response<SSHKey[]>>> {
    return this.client.paginate(
      async () => {
        const { req } = await this.client.make('GET', `/users/${userId}/sshkeys`);
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      isSSHKeyListResponse
    );
  }
}
