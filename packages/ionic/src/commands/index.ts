import * as chalk from 'chalk';
import * as minimist from 'minimist';

import {
  CommandMap,
  IonicEnvironment,
  Namespace,
  NamespaceMap,
  isCommand,
} from '@ionic/cli-utils';

import { ERROR_PLUGIN_NOT_INSTALLED, KNOWN_PLUGINS, ORG_PREFIX, PLUGIN_PREFIX, loadPlugin } from '../lib/plugins'

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
    const [inputs, cmdOrNamespace] = this.locate(argv._);

    if (!isCommand(cmdOrNamespace)) {
      if (env.project.directory && KNOWN_PLUGINS.indexOf(inputs[0]) !== -1) {
        try {
          await loadPlugin(env.project.directory, `${ORG_PREFIX}/${PLUGIN_PREFIX}${inputs[0]}`);
        } catch(e) {
          if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
            throw e;
          }
        }

        return;
      }

      return HelpCommand.showHelp(env, argv._);
    }

    const command = cmdOrNamespace;

    command.env = env;

    await command.load();
    await command.execute(inputs);
    await command.unload();
  }
}
