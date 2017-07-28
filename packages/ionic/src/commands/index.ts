import * as chalk from 'chalk';
import * as minimist from 'minimist';

import {
  CommandMap,
  IRootNamespace,
  IonicEnvironment,
  KNOWN_COMMAND_PLUGINS,
  Namespace,
  NamespaceMap,
  ORG_PREFIX,
  PLUGIN_PREFIX,
  isCommand,
  isValidationErrorArray,
  metadataToMinimistOptions,
  promptToInstallPlugin,
  registerPlugin,
  showHelp,
} from '@ionic/cli-utils';

import { ConfigNamespace } from './config/index';
import { GitNamespace } from './git/index';
import { SSHNamespace } from './ssh/index';
import { PackageNamespace } from './package/index';

import { BuildCommand } from './build';
import { InfoCommand } from './info';
import { LoginCommand } from './login';
import { LogoutCommand } from './logout';
import { SignupCommand } from './signup';
import { StartCommand } from './start';
import { VersionCommand } from './version';
import { HelpCommand } from './help';
import { TelemetryCommand } from './telemetry';
import { DocsCommand } from './docs';
import { DaemonCommand } from './daemon';
import { IonitronCommand } from './ionitron';
import { ServeCommand } from './serve';
import { GenerateCommand } from './generate';
import { LinkCommand } from './link';
import { UploadCommand } from './upload';

export class IonicNamespace extends Namespace implements IRootNamespace {
  readonly root = true;
  readonly name = 'ionic';
  readonly source = 'ionic';

  namespaces = new NamespaceMap([
    ['config', () => new ConfigNamespace()],
    ['git', () => new GitNamespace()],
    ['ssh', () => new SSHNamespace()],
    ['package', () => new PackageNamespace()],
  ]);

  commands = new CommandMap([
    ['start', () => new StartCommand()],
    ['serve', () => new ServeCommand()],
    ['build', () => new BuildCommand()],
    ['help', () => new HelpCommand()],
    ['info', () => new InfoCommand()],
    ['login', () => new LoginCommand()],
    ['logout', () => new LogoutCommand()],
    ['signup', () => new SignupCommand()],
    ['version', () => new VersionCommand()],
    ['telemetry', () => new TelemetryCommand()],
    ['docs', () => new DocsCommand()],
    ['daemon', () => new DaemonCommand()],
    ['ionitron', () => new IonitronCommand()],
    ['generate', () => new GenerateCommand()],
    ['g', 'generate'],
    ['link', () => new LinkCommand()],
    ['upload', () => new UploadCommand()],
  ]);

  async runCommand(env: IonicEnvironment, pargv: string[]): Promise<void | number> {
    const config = await env.config.load();

    const argv = minimist(pargv, { boolean: true, string: '_' });
    let [ depth, inputs, cmdOrNamespace ] = this.locate(argv._);

    if (cmdOrNamespace === this && KNOWN_COMMAND_PLUGINS.indexOf(inputs[0]) !== -1) {
      const plugin = await promptToInstallPlugin(env, `${ORG_PREFIX}/${PLUGIN_PREFIX}${inputs[0]}`, {});

      if (plugin) {
        registerPlugin(env, plugin);
        [ depth, inputs, cmdOrNamespace ] = env.namespace.locate(inputs);
      }
    }

    if (!isCommand(cmdOrNamespace)) {
      return showHelp(env, argv._);
    }

    const command = cmdOrNamespace;
    command.metadata.minimistOpts = metadataToMinimistOptions(command.metadata);

    if (command.metadata.backends && !command.metadata.backends.includes(config.backend)) {
      env.log.error(
        `Sorry! The configured backend (${chalk.bold(config.backend)}) does not know about ${chalk.green('ionic ' + command.metadata.fullName)}.\n` +
        `You can switch backends with ${chalk.green('ionic config set -g backend')}.`
      );
      return 1;
    }

    const options = minimist(pargv, command.metadata.minimistOpts);
    inputs = options._.slice(depth);
    command.env = env;

    await command.validate(inputs);

    if (!env.project.directory && command.metadata.type === 'project') {
      env.log.error(`Sorry! ${chalk.green('ionic ' + command.metadata.fullName)} can only be run in an Ionic project directory.`);
      return 1;
    }

    if (command.metadata.options) {
      let found = false;

      for (let opt of command.metadata.options) {
        if (opt.backends && opt.default !== options[opt.name] && !opt.backends.includes(config.backend)) {
          found = true;
          env.log.warn(`${chalk.green('--' + (opt.default === true ? 'no-' : '') + opt.name)} has no effect with the configured backend (${chalk.bold(config.backend)}).`);
        }
      }

      if (found) {
        env.log.info(`You can switch backends with ${chalk.green('ionic config set -g backend')}.`);
      }
    }

    try {
      await command.execute(inputs, options);
    } catch (e) {
      const cmdsource = command.metadata.source;
      if (this.source !== cmdsource && !e.fatal && !isValidationErrorArray(e)) {
        env.log.warn(`Error occurred during command execution from a CLI plugin${cmdsource ? ' (' + chalk.green(cmdsource) + ')' : ''}.`);
      }

      throw e;
    }
  }
}
