import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';
import * as SSHConfig from 'ssh-config';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ICommand,
  indent,
  prettyPath,
  promisify,
  validators
} from '@ionic/cli';

import { diffPatch } from '../../utils/diff';

const fsReadFile = promisify<string, string, string>(fs.readFile);
const fsWriteFile = promisify<void, string, any, { encoding?: string; mode?: number; flag?: string; }>(fs.writeFile);
const fsStat = promisify<fs.Stats, string>(fs.stat);

function isConfigDirective(entry: SSHConfig.Config): entry is SSHConfig.ConfigDirective {
  return entry.type === SSHConfig.DIRECTIVE;
}

@CommandMetadata({
  name: 'use',
  description: 'Set your active Ionic SSH key',
  inputs: [
    {
      name: 'key-path',
      description: 'Location of private key file to use',
      validators: [validators.required]
    },
  ],
  options: [
    {
      name: 'yes',
      description: 'Answer yes to all confirmation prompts',
      aliases: ['y'],
      type: Boolean
    }
  ],
  isProjectTask: false
})
export class SSHUseCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const p = path.resolve(os.homedir(), '.ssh', 'config');
    const keyPath = path.resolve(inputs[0]);
    const isValidKey = await this.isValidKey(keyPath);
    const skipPrompts = options['yes'];

    if (!isValidKey) {
      return;
    }

    const text1 = await this.loadFile(p);
    const text2 = this.setIdentifyKey(text1, keyPath);

    if (text1 === text2) {
      this.env.log.warn(`${chalk.bold(keyPath)} is already your active SSH key!`);
      return;
    } else if (!skipPrompts) {
      const diff = diffPatch(p, text1, text2);

      process.stdout.write(diff);

      const confirmation = await this.env.inquirer.prompt({
        type: 'confirm',
        name: 'apply',
        message: `May we make the above change(s) to '${prettyPath(p)}'?`
      });

      if (!confirmation['apply']) {
        // TODO: link to docs about manual git setup
        return;
      }
    }

    await fsWriteFile(p, text2, { encoding: 'utf8', mode: 0o600 });

    this.env.log.info(`Your active Ionic SSH key has been set to ${chalk.bold(keyPath)}!`);
  }

  async isValidKey(keyPath: string): Promise<boolean> {
    try {
      await fsStat(keyPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.env.log.error(`${chalk.bold(keyPath)} does not appear to exist. Please specify a valid SSH private key.\n`
                         + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
        return false;
      }

      throw e;
    }

    const f = await fsReadFile(keyPath, 'utf8');
    const lines = f.split('\n');

    if (!lines[0].match(/^\-{5}BEGIN [R|D]SA PRIVATE KEY\-{5}$/)) {
      this.env.log.error(`${chalk.bold(keyPath)} does not appear to be a valid SSH private key. (Missing '-----BEGIN RSA PRIVATE KEY-----' header.)\n`
                       + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
      return false;
    }

    return true;
  }

  setIdentifyKey(text: string, keyPath: string): string {
    const host = 'git.ionic.io'; // TODO: config variable
    const conf = SSHConfig.parse(text);
    const section = conf.find({ Host: host });

    const insert = `${indent(4)}IdentityFile ${keyPath}`;

    if (section) {
      const found = section.config.some((line) => {
        if (isConfigDirective(line)) {
          if (line.param === 'IdentityFile') {
            line.value = keyPath;
            return true;
          }
        }

        return false;
      });

      if (!found) {
        section.config = section.config.concat(SSHConfig.parse(`${insert}\n`));
      }
    } else {
      conf.push(SSHConfig.parse(`${text ? '\n' : ''}Host ${host}\n${insert}\n`)[0]);
    }

    return SSHConfig.stringify(conf);
  }

  async loadFile(filepath: string): Promise<string> {
    try {
      return await fsReadFile(filepath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        return '';
      }

      throw e;
    }
  }
}
