import * as chalk from 'chalk';
import * as minimist from 'minimist';

import {
  CommandEnvironment,
  ICommand,
  ICommandMap,
  IIonicNamespace,
  IIonicNamespaceRunOptions,
  INamespace
} from '../definitions';

import { DocsCommand } from './docs';
import { HelpCommand } from './help';
import { InfoCommand } from './info';
import { IonitronCommand } from './ionitron';
import { LoginCommand } from './login';
import { StartCommand } from './start';
import { VersionCommand } from './version';

import { FatalException } from '../lib/errors';
import { formatCommandHelp } from '../lib/help';
import { ERROR_PLUGIN_NOT_FOUND, PluginLoader } from '../lib/plugins';
import { CommandMap, Namespace } from '../lib/command/namespace';

export class IonicNamespace extends Namespace implements IIonicNamespace {
  public name = 'ionic';
  public get help() { return new HelpCommand(); };
  protected loader: PluginLoader;

  constructor(public env: CommandEnvironment) {
    super(env);
    this.loader = new PluginLoader();
  }

  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('docs', new DocsCommand());
    m.set('help', this.help);
    m.set('info', new InfoCommand());
    m.set('ionitron', new IonitronCommand());
    m.set('login', new LoginCommand());
    m.set('start', new StartCommand());
    m.set('version', new VersionCommand());

    return m;
  }

  async run(pargv: string[], opts: IIonicNamespaceRunOptions = {}): Promise<void> {
    if (opts.showCommand === undefined) {
      opts.showCommand = true;
    }

    this.env.pargv = pargv;

    const argv = minimist(pargv);
    let [inputs, command] = this.resolve(argv._);

    if (argv['help']) {
      if (!command) {
        throw new FatalException(`Command not found: ${chalk.bold(argv._.join(' '))}.`);
      }

      console.log(formatCommandHelp(command.metadata));
    } else {
      if (!command) {
        command = this.help;
      }

      if (opts.showCommand) {
        console.log(`\n> ${this.name} ${pargv.join(' ')}\n`);
      }

      return command.execute(this, this.env, inputs);
    }
  }

  resolve(argv: string[]): [string[], ICommand | undefined] {
    let ns: INamespace = this;

    if (argv.length > 0 && argv[0].indexOf(':') !== -1) {
      const [pluginName, pluginCommand] = argv[0].split(':');

      try {
        const cls = this.loader.load(pluginName);
        ns = new cls(this.env);
      } catch (e) {
        if (e === ERROR_PLUGIN_NOT_FOUND) {
          if (this.loader.has(pluginName)) {
            throw new FatalException('This plugin is not currently installed. Please execute the following to install it.\n'
                                   + `    ${chalk.bold(`npm install ${this.loader.prefix}${pluginName}`)}`);
          } else {
            throw new FatalException(`Unknown plugin: ${chalk.bold(this.loader.prefix + pluginName)}.`);
          }
        }

        throw e;
      }

      argv[0] = pluginCommand;
    }

    function _resolve(inputs: string[], ns: INamespace): [string[], ICommand | undefined] {
      const namespaces = ns.getNamespaces();

      if (!namespaces.has(inputs[0])) {
        const commands = ns.getCommands();
        const command = commands.get(inputs[0]);

        if (!command) {
          return [argv, undefined];
        }

        return [inputs.slice(1), command];
      }

      const nextNamespace = namespaces.get(inputs[0]);

      if (!nextNamespace) {
        return [argv, undefined];
      }

      return _resolve(inputs.slice(1), nextNamespace);
    }

    return _resolve(argv, ns);
  }
}

