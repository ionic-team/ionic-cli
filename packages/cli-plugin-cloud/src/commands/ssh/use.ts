import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';
import * as SSHConfig from 'ssh-config';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ICommand,
  fileToString,
  indent,
  prettyPath,
  promisify,
  validators
} from '@ionic/cli';

import { Command } from '../../command';
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

    const text1 = await fileToString(p);
    const text2 = await this.applyConfig(text1, keyPath);

    if (text1 === text2) {
      this.env.log.ok(`${chalk.bold(keyPath)} is already your active SSH key.`);
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

    this.env.log.ok(`Your active Ionic SSH key has been set to ${chalk.bold(keyPath)}!`);
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

  async applyConfig(text: string, keyPath: string): Promise<string> {
    const c = await this.config.load();
    const conf = SSHConfig.parse(text);
    const host = c.git.host;
    const section = this.ensureSection(conf, host, Boolean(text));

    this.ensureSectionLine(section, 'IdentityFile', keyPath);

    if (typeof c.git.port === 'number') {
      this.ensureSectionLine(section, 'Port', String(c.git.port));
    }

    return SSHConfig.stringify(conf);
  }

  ensureSection(conf: SSHConfig.SSHConfig, host: string, newline: boolean): SSHConfig.ConfigDirective {
    const section = conf.find({ Host: host });

    if (!section) {
      conf.push(SSHConfig.parse(`${newline ? '\n' : ''}Host ${host}\n`)[0]);
    }

    return conf.find({ Host: host });
  }

  ensureSectionLine(section: SSHConfig.ConfigDirective, key: string, value: string): void {
    const found = section.config.some((line) => {
      if (isConfigDirective(line)) {
        if (line.param === key) {
          line.value = value;
          return true;
        }
      }

      return false;
    });

    if (!found) {
      section.config = section.config.concat(SSHConfig.parse(`${indent(4)}${key} ${value}\n`));
    }
  }
}
