import * as chalk from 'chalk';
import * as minimist from 'minimist';

import { CommandMap, IonicEnvironment, Namespace, NamespaceMap } from '@ionic/cli-utils';

import { PackageNamespace } from './package/index';

import { InfoCommand } from './info';
import { LoginCommand } from './login';
import { SignupCommand } from './signup';
import { StartCommand } from './start';
import { VersionCommand } from './version';
import { HelpCommand } from './help';
import { TelemetryCommand } from './telemetry';
import { DocsCommand } from './docs';
import { IonitronCommand } from './ionitron';
import { ServeCommand } from './serve';
import { GenerateCommand } from './generate';
import { LinkCommand } from './link';
import { UploadCommand } from './upload';

export class IonicNamespace extends Namespace {
  namespaces = new NamespaceMap([
    ['package', () => new PackageNamespace()],
  ]);

  commands = new CommandMap([
    ['start', () => new StartCommand()],
    ['serve', () => new ServeCommand()],
    ['help', () => new HelpCommand()],
    ['info', () => new InfoCommand()],
    ['login', () => new LoginCommand()],
    ['signup', () => new SignupCommand()],
    ['version', () => new VersionCommand()],
    ['telemetry', () => new TelemetryCommand()],
    ['docs', () => new DocsCommand()],
    ['ionitron', () => new IonitronCommand()],
    ['generate', () => new GenerateCommand()],
    ['link', () => new LinkCommand()],
    ['upload', () => new UploadCommand()],
  ]);

  async runCommand(env: IonicEnvironment): Promise<void> {
    const argv = minimist(env.pargv);
    const [inputs, command] = this.locateCommand(argv._);

    // If the command was not found throw
    if (!command) {
      throw `Command not found: ${chalk.bold(argv._.join(' '))}.`;
    }

    command.env = env;

    await command.load();
    await command.execute(inputs);
    await command.unload();
  }
}
