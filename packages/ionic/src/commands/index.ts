import chalk from 'chalk';

import { metadataToParseArgsOptions, parseArgs } from '@ionic/cli-framework';
import { CommandMetadata, CommandMetadataOption, IonicEnvironment, KNOWN_BACKENDS } from '@ionic/cli-utils';
import { CommandMap, Namespace, NamespaceMap } from '@ionic/cli-utils/lib/namespace';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { PROJECT_FILE } from '@ionic/cli-utils/lib/project';

export class IonicNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic',
      description: '',
    };
  }

  async getNamespaces(): Promise<NamespaceMap> {
    return new NamespaceMap([
      ['config', async () => { const { ConfigNamespace } = await import('./config/index'); return new ConfigNamespace(this); }],
      ['cordova', async () => { const { CordovaNamespace } = await import('./cordova/index'); return new CordovaNamespace(this); }],
      ['git', async () => { const { GitNamespace } = await import('./git/index'); return new GitNamespace(this); }],
      ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(this); }],
      ['package', async () => { const { PackageNamespace } = await import('./package/index'); return new PackageNamespace(this); }],
      ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(this); }],
      ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(this); }],
      ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(this); }],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['start', async () => { const { StartCommand } = await import('./start'); return new StartCommand(this); }],
      ['serve', async () => { const { ServeCommand } = await import('./serve'); return new ServeCommand(this); }],
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['help', async () => { const { HelpCommand } = await import('./help'); return new HelpCommand(this); }],
      ['info', async () => { const { InfoCommand } = await import('./info'); return new InfoCommand(this); }],
      ['login', async () => { const { LoginCommand } = await import('./login'); return new LoginCommand(this); }],
      ['logout', async () => { const { LogoutCommand } = await import('./logout'); return new LogoutCommand(this); }],
      ['signup', async () => { const { SignupCommand } = await import('./signup'); return new SignupCommand(this); }],
      ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(this); }],
      ['telemetry', async () => { const { TelemetryCommand } = await import('./telemetry'); return new TelemetryCommand(this); }],
      ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(this); }],
      ['daemon', async () => { const { DaemonCommand } = await import('./daemon'); return new DaemonCommand(this); }],
      ['ionitron', async () => { const { IonitronCommand } = await import('./ionitron'); return new IonitronCommand(this); }],
      ['generate', async () => { const { GenerateCommand } = await import('./generate'); return new GenerateCommand(this); }],
      ['link', async () => { const { LinkCommand } = await import('./link'); return new LinkCommand(this); }],
      ['upload', async () => { const { UploadCommand } = await import('./upload'); return new UploadCommand(this); }],
      ['state', async () => { const { StateCommand } = await import('./state'); return new StateCommand(this); }],
      ['share', async () => { const { ShareCommand } = await import('./share'); return new ShareCommand(this); }],
      ['g', 'generate'],
    ]);
  }

  async runCommand(ienv: IonicEnvironment, pargv: string[], env: { [key: string]: string; }): Promise<void> {
    const { isCommand } = await import('@ionic/cli-utils/guards');

    const config = await ienv.config.load();

    const argv = parseArgs(pargv, { boolean: true, string: '_' });
    let { args, obj, path } = await this.locate(argv._);

    if (!isCommand(obj)) {
      const { showHelp } = await import('@ionic/cli-utils/lib/help');
      await ienv.telemetry.sendCommand('ionic help', argv._);
      return showHelp(ienv, argv._);
    }

    const command = obj;
    const metadata = await command.getMetadata();
    const fullNameParts = path.map(([p]) => p);

    if (metadata.options) {
      const optMap = metadataToCmdOptsEnv(metadata, fullNameParts.slice(1));

      // TODO: changes opt by reference, which is probably bad
      for (let [ opt, envvar ] of optMap.entries()) {
        const envdefault = env[envvar];

        if (typeof envdefault !== 'undefined') {
          opt.default = opt.type === Boolean ? (envdefault && envdefault !== '0' ? true : false) : envdefault;
        }
      }
    }

    const minimistOpts = metadataToParseArgsOptions(metadata);

    if (metadata.backends && !metadata.backends.includes(config.backend)) {
      throw new FatalException(
        `Sorry! The configured backend (${chalk.bold(config.backend)}) does not know about ${chalk.green(fullNameParts.join(' '))}.\n` +
        `You can switch backends with ${chalk.green('ionic config set -g backend')} (choose from ${KNOWN_BACKENDS.map(v => chalk.green(v)).join(', ')}).`
      );
    }

    const options = parseArgs(pargv, minimistOpts);
    command.env = ienv;

    if (!ienv.project.directory && metadata.type === 'project') {
      throw new FatalException(
        `Sorry! ${chalk.green(fullNameParts.join(' '))} can only be run in an Ionic project directory.\n` +
        `If this is a project you'd like to integrate with Ionic, create an ${chalk.bold(PROJECT_FILE)} file.`
      );
    }

    if (metadata.options) {
      let found = false;

      for (let opt of metadata.options) {
        if (opt.backends && opt.default !== options[opt.name] && !opt.backends.includes(config.backend)) {
          found = true;
          ienv.log.warn(`${chalk.green('--' + (opt.default === true ? 'no-' : '') + opt.name)} has no effect with the configured backend (${chalk.bold(config.backend)}).`);
        }
      }

      if (found) {
        ienv.log.info(`You can switch backends with ${chalk.green('ionic config set -g backend')}.`);
      }
    }

    await command.execute(args, options);
  }
}

export function metadataToCmdOptsEnv(metadata: CommandMetadata, cmdNameParts: string[]): Map<CommandMetadataOption, string> {
  const optMap = new Map<CommandMetadataOption, string>();

  if (!metadata.options) {
    return optMap;
  }

  const prefix = `IONIC_CMDOPTS_${cmdNameParts.map(s => s.toUpperCase()).join('_')}`;

  for (let option of metadata.options) {
    optMap.set(option, `${prefix}_${option.name.toUpperCase().split('-').join('_')}`);
  }

  return optMap;
}
