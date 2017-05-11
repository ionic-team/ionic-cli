import * as chalk from 'chalk';
import * as minimist from 'minimist';

import {
  CommandMap,
  IonicEnvironment,
  KNOWN_PLUGINS,
  Namespace,
  NamespaceMap,
  ORG_PREFIX,
  PLUGIN_PREFIX,
  installPlugin,
  isCommand,
  metadataToMinimistOptions,
  promptToInstallPlugin,
  showHelp,
} from '@ionic/cli-utils';

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
  root = true;
  name = 'ionic';

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
    ['g', 'generate'],
    ['link', () => new LinkCommand()],
    ['upload', () => new UploadCommand()],
  ]);

  async runCommand(env: IonicEnvironment): Promise<void> {
    let [inputs, cmdOrNamespace] = this.locate(env.argv._);

    if (cmdOrNamespace === this && KNOWN_PLUGINS.indexOf(inputs[0]) !== -1) {
      const plugin = await promptToInstallPlugin(env, `${ORG_PREFIX}/${PLUGIN_PREFIX}${inputs[0]}`, {});

      if (plugin) {
        installPlugin(env, plugin);
        [inputs, cmdOrNamespace] = env.namespace.locate(inputs);
      }
    }

    if (!isCommand(cmdOrNamespace)) {
      return showHelp(env, env.argv._);
    }

    const command = cmdOrNamespace;
    const minimistOptions = metadataToMinimistOptions(command.metadata);
    const options = minimist(env.pargv, minimistOptions);
    env.argv = options;
    command.env = env;

    const validationErrors = command.validate(inputs);

    if (validationErrors.length > 0) {
      for (let e of validationErrors) {
        env.log.error(e.message);
      }

      return showHelp(env, env.argv._);
    }

    if (!env.project.directory && command.metadata.type === 'project') {
      env.log.error(`Sorry! ${chalk.green('ionic ' + command.metadata.fullName)} can only be run in an Ionic project directory.`);
      return;
    }

    await command.execute(inputs, options);
  }
}
