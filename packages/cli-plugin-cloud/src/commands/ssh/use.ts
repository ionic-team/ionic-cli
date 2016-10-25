import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

import * as SSHConfig from 'ssh-config';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ICommand,
  TaskChain,
  indent,
  isAPIResponseSuccess,
  prettyPath,
  promisify,
  readLines,
  writeLines
} from '@ionic/cli';

import { diffPatch } from '../../utils/diff';

const fsReadFile = promisify<string, string, string>(fs.readFile);
const fsWriteFile = promisify<void, string, any, { encoding?: string; mode?: number; flag?: string; }>(fs.writeFile);

function isConfigComment(entry: SSHConfig.Config): entry is SSHConfig.ConfigComment {
  return entry.type === SSHConfig.COMMENT;
}

function isConfigDirective(entry: SSHConfig.Config): entry is SSHConfig.ConfigDirective {
  return entry.type === SSHConfig.DIRECTIVE;
}

@CommandMetadata({
  name: 'use',
  description: 'Set your active Ionic SSH key',
  inputs: [
    {
      name: 'key-path',
      description: 'Location of private key file to use'
    },
  ],
  isProjectTask: false
})
export class SSHUseCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const host = 'git.ionic.io';
    const p = path.resolve(os.homedir(), '.ssh', 'config');
    const keyPath = path.resolve(inputs[0]);

    const text1 = await this.loadFile(p);

    const conf = SSHConfig.parse(text1);
    const section = conf.find({ Host: host });

    const insert = `${indent(4)}IdentityKey ${keyPath}`;

    if (section) {
      const found = section.config.some((line) => {
        if (isConfigDirective(line)) {
          if (line.param === 'IdentityKey') {
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
      conf.push(SSHConfig.parse(`${text1 ? '\n' : ''}Host ${host}\n${insert}\n`)[0]);
    }

    const text2 = SSHConfig.stringify(conf);
    const diff = diffPatch(p, text1, text2);

    process.stdout.write(diff);

    const confirmation = await this.env.modules.inquirer.prompt({
      type: 'confirm',
      name: 'apply',
      message: `May we make the above changes to '${p}'?`
    });

    if (confirmation['apply']) {
      await fsWriteFile(p, text2, { encoding: 'utf8', mode: 0o600 });
    }
  }

  protected async loadFile(filepath: string): Promise<string> {
    try {
      return await fsReadFile(filepath, 'utf8');
    } catch(e) {
      if (e.code === 'ENOENT') {
        return '';
      }

      throw e;
    }
  }
}
