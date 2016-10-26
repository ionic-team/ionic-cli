import * as fs from 'fs';

import * as chalk from 'chalk';

import { prettyPath, promisify, FatalException } from '@ionic/cli';

const fsStat = promisify<fs.Stats, string>(fs.stat);
const fsReadFile = promisify<string, string, string>(fs.readFile);

export async function parsePublicKeyFile(pubkeyPath: string): Promise<[string, string, string, string]> {
  try {
    await fsStat(pubkeyPath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new FatalException(`${chalk.bold(prettyPath(pubkeyPath))} does not appear to exist. Please specify a valid SSH public key.\n`
                             + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
    }

    throw e;
  }

  return parsePublicKey((await fsReadFile(pubkeyPath, 'utf8')).trim(), prettyPath(pubkeyPath));
}

export async function parsePublicKey(pubkey: string, name: string): Promise<[string, string, string, string]> {
  const r = /^(ssh-[r|d]sa)\s([A-z0-9+\/]+)\s?(.+)?$/.exec(pubkey);

  if (!r) {
    throw new FatalException(`${chalk.bold(name)} does not appear to be a valid SSH public key. (Not in ${chalk.bold('authorized_keys')} file format.)\n`
                           + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
  }

  if (!r[3]) {
    throw new FatalException(`${chalk.bold(name)} is missing an annotation/comment after the public key.\n`
                           + `If you are using ${chalk.bold('ssh-keygen')}, try using the ${chalk.bold('-C')} flag.\n`
                           + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
  }

  r[1] = r[1].trim();
  r[2] = r[2].trim();
  r[3] = r[3].trim();

  if (r[3].match(/\s/)) {
    throw new FatalException(`${chalk.bold(name)} has an annotation/comment ('${chalk.bold(r[3])}') that has whitespace.\n`
                           + `Try changing the comment to something more like an identifier, perhaps '${chalk.bold(r[3].replace(/\s/g, '-').toLowerCase())}'?\n`
                           + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
  }

  return [pubkey, r[1], r[2], r[3]];
}
