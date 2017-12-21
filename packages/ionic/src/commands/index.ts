import chalk from 'chalk';

import { metadataToParseArgsOptions, parseArgs } from '@ionic/cli-framework/lib';

import { CommandData, CommandOption, IonicEnvironment, KNOWN_BACKENDS } from '@ionic/cli-utils';
import { CommandMap, NamespaceMap, RootNamespace } from '@ionic/cli-utils/lib/namespace';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { PROJECT_FILE } from '@ionic/cli-utils/lib/project';

export class IonicNamespace extends RootNamespace {
  metadata = {
    name: 'ionic',
    description: '',
  };

  namespaces = new NamespaceMap([
    ['config', async () => { const { ConfigNamespace } = await import('./config/index'); return new ConfigNamespace(); }],
    ['cordova', async () => { const { CordovaNamespace } = await import('./cordova/index'); return new CordovaNamespace(); }],
    ['git', async () => { const { GitNamespace } = await import('./git/index'); return new GitNamespace(); }],
    ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(); }],
    ['package', async () => { const { PackageNamespace } = await import('./package/index'); return new PackageNamespace(); }],
    ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(); }],
    ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(); }],
    ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(); }],
  ]);

  commands = new CommandMap([
    ['start', async () => { const { StartCommand } = await import('./start'); return new StartCommand(); }],
    ['serve', async () => { const { ServeCommand } = await import('./serve'); return new ServeCommand(); }],
    ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(); }],
    ['help', async () => { const { HelpCommand } = await import('./help'); return new HelpCommand(); }],
    ['info', async () => { const { InfoCommand } = await import('./info'); return new InfoCommand(); }],
    ['login', async () => { const { LoginCommand } = await import('./login'); return new LoginCommand(); }],
    ['logout', async () => { const { LogoutCommand } = await import('./logout'); return new LogoutCommand(); }],
    ['signup', async () => { const { SignupCommand } = await import('./signup'); return new SignupCommand(); }],
    ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(); }],
    ['telemetry', async () => { const { TelemetryCommand } = await import('./telemetry'); return new TelemetryCommand(); }],
    ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(); }],
    ['daemon', async () => { const { DaemonCommand } = await import('./daemon'); return new DaemonCommand(); }],
    ['ionitron', async () => { const { IonitronCommand } = await import('./ionitron'); return new IonitronCommand(); }],
    ['generate', async () => { const { GenerateCommand } = await import('./generate'); return new GenerateCommand(); }],
    ['g', 'generate'],
    ['link', async () => { const { LinkCommand } = await import('./link'); return new LinkCommand(); }],
    ['upload', async () => { const { UploadCommand } = await import('./upload'); return new UploadCommand(); }],
    ['state', async () => { const { StateCommand } = await import('./state'); return new StateCommand(); }],
    ['share', async () => { const { ShareCommand } = await import('./share'); return new ShareCommand(); }],
  ]);

  async runCommand(ienv: IonicEnvironment, pargv: string[], env: { [key: string]: string; }): Promise<void> {
    const { isCommand } = await import('@ionic/cli-utils/guards');

    const config = await ienv.config.load();

    const argv = parseArgs(pargv, { boolean: true, string: '_' });
    let [ depth, inputs, cmdOrNamespace ] = await this.locate(argv._);

    if (!isCommand(cmdOrNamespace)) {
      const { showHelp } = await import('@ionic/cli-utils/lib/help');
      await ienv.telemetry.sendCommand('ionic help', argv._);
      return showHelp(ienv, argv._);
    }

    const command = cmdOrNamespace;

    if (command.metadata.options) {
      const optMap = metadataToCmdOptsEnv(command.metadata);

      // TODO: changes opt by reference, which is probably bad
      for (let [ opt, envvar ] of optMap.entries()) {
        const envdefault = env[envvar];

        if (typeof envdefault !== 'undefined') {
          opt.default = opt.type === Boolean ? (envdefault && envdefault !== '0' ? true : false) : envdefault;
        }
      }
    }

    const minimistOpts = metadataToParseArgsOptions(command.metadata);

    if (command.metadata.backends && !command.metadata.backends.includes(config.backend)) {
      throw new FatalException(
        `Sorry! The configured backend (${chalk.bold(config.backend)}) does not know about ${chalk.green('ionic ' + command.metadata.fullName)}.\n` +
        `You can switch backends with ${chalk.green('ionic config set -g backend')} (choose from ${KNOWN_BACKENDS.map(v => chalk.green(v)).join(', ')}).\n`
      );
    }

    const options = parseArgs(pargv, minimistOpts);
    inputs = options._.slice(depth);
    command.env = ienv;

    if (!ienv.project.directory && command.metadata.type === 'project') {
      throw new FatalException(
        `Sorry! ${chalk.green('ionic ' + command.metadata.fullName)} can only be run in an Ionic project directory.\n` +
        `If this is a project you'd like to integrate with Ionic, create an ${chalk.bold(PROJECT_FILE)} file.`
      );
    }

    if (command.metadata.options) {
      let found = false;

      for (let opt of command.metadata.options) {
        if (opt.backends && opt.default !== options[opt.name] && !opt.backends.includes(config.backend)) {
          found = true;
          ienv.log.warn(`${chalk.green('--' + (opt.default === true ? 'no-' : '') + opt.name)} has no effect with the configured backend (${chalk.bold(config.backend)}).`);
        }
      }

      if (found) {
        ienv.log.info(`You can switch backends with ${chalk.green('ionic config set -g backend')}.`);
      }
    }

    await command.execute(inputs, options);
  }
}

export function metadataToCmdOptsEnv(metadata: CommandData): Map<CommandOption, string> {
  const optMap = new Map<CommandOption, string>();

  if (!metadata.options) {
    return optMap;
  }

  const fullName = metadata.fullName ? metadata.fullName : metadata.name;
  const prefix = `IONIC_CMDOPTS_${fullName.toUpperCase().split(' ').join('_')}`;

  for (let option of metadata.options) {
    optMap.set(option, `${prefix}_${option.name.toUpperCase().split('-').join('_')}`);
  }

  return optMap;
}
