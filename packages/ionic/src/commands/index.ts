import chalk from 'chalk';

import { hydrateCommandMetadataOption, metadataToParseArgsOptions, parseArgs, stripOptions } from '@ionic/cli-framework';
import { CommandMetadata, CommandMetadataOption, KNOWN_BACKENDS, isCommand } from '@ionic/cli-utils';
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
      ['config', async () => { const { ConfigNamespace } = await import('./config/index'); return new ConfigNamespace(this, this.env); }],
      ['cordova', async () => { const { CordovaNamespace } = await import('./cordova/index'); return new CordovaNamespace(this, this.env); }],
      ['git', async () => { const { GitNamespace } = await import('./git/index'); return new GitNamespace(this, this.env); }],
      ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(this, this.env); }],
      ['package', async () => { const { PackageNamespace } = await import('./package/index'); return new PackageNamespace(this, this.env); }],
      ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(this, this.env); }],
      ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(this, this.env); }],
      ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(this, this.env); }],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this, this.env); }],
      ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(this, this.env); }],
      ['g', 'generate'],
      ['generate', async () => { const { GenerateCommand } = await import('./generate'); return new GenerateCommand(this, this.env); }],
      ['help', async () => { const { HelpCommand } = await import('./help'); return new HelpCommand(this, this.env); }],
      ['info', async () => { const { InfoCommand } = await import('./info'); return new InfoCommand(this, this.env); }],
      ['ionitron', async () => { const { IonitronCommand } = await import('./ionitron'); return new IonitronCommand(this, this.env); }],
      ['link', async () => { const { LinkCommand } = await import('./link'); return new LinkCommand(this, this.env); }],
      ['login', async () => { const { LoginCommand } = await import('./login'); return new LoginCommand(this, this.env); }],
      ['logout', async () => { const { LogoutCommand } = await import('./logout'); return new LogoutCommand(this, this.env); }],
      ['serve', async () => { const { ServeCommand } = await import('./serve'); return new ServeCommand(this, this.env); }],
      ['share', async () => { const { ShareCommand } = await import('./share'); return new ShareCommand(this, this.env); }],
      ['signup', async () => { const { SignupCommand } = await import('./signup'); return new SignupCommand(this, this.env); }],
      ['start', async () => { const { StartCommand } = await import('./start'); return new StartCommand(this, this.env); }],
      ['state', async () => { const { StateCommand } = await import('./state'); return new StateCommand(this, this.env); }],
      ['telemetry', async () => { const { TelemetryCommand } = await import('./telemetry'); return new TelemetryCommand(this, this.env); }],
      ['upload', async () => { const { UploadCommand } = await import('./upload'); return new UploadCommand(this, this.env); }],
      ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(this, this.env); }],
    ]);
  }

  async runCommand(pargv: string[], env: { [key: string]: string; }): Promise<void> {
    const config = await this.env.config.load();

    const pargs = stripOptions(pargv);

    let { args, obj, path } = await this.locate(pargs);

    if (!isCommand(obj)) {
      const { showHelp } = await import('@ionic/cli-utils/lib/help');
      await this.env.telemetry.sendCommand('ionic help', pargs);
      return showHelp(this.env, pargs);
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

    if (!this.env.project.directory && metadata.type === 'project') {
      throw new FatalException(
        `Sorry! ${chalk.green(fullNameParts.join(' '))} can only be run in an Ionic project directory.\n` +
        `If this is a project you'd like to integrate with Ionic, create an ${chalk.bold(PROJECT_FILE)} file.`
      );
    }

    if (metadata.options) {
      let found = false;

      for (let o of metadata.options) {
        const opt = hydrateCommandMetadataOption(o);

        if (opt.backends && opt.default !== options[opt.name] && !opt.backends.includes(config.backend)) {
          found = true;
          this.env.log.warn(`${chalk.green('--' + (opt.default === true ? 'no-' : '') + opt.name)} has no effect with the configured backend (${chalk.bold(config.backend)}).`);
        }
      }

      if (found) {
        this.env.log.info(`You can switch backends with ${chalk.green('ionic config set -g backend')}.`);
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
