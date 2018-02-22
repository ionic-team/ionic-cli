import * as lodash from 'lodash';
import chalk from 'chalk';

import { metadataToParseArgsOptions, parseArgs, stripOptions } from '@ionic/cli-framework';
import { CommandMetadata, CommandMetadataOption, PROJECT_FILE, isCommand } from '@ionic/cli-utils';
import { CommandMap, Namespace, NamespaceMap } from '@ionic/cli-utils/lib/namespace';
import { FatalException } from '@ionic/cli-utils/lib/errors';

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
      ['ssl', async () => { const { SSLNamespace } = await import('./ssl/index'); return new SSLNamespace(this, this.env); }],
      ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(this, this.env); }],
      ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(this, this.env); }],
      ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(this, this.env); }],
      ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(this, this.env); }],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this, this.env); }],
      ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(this, this.env); }],
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
      ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(this, this.env); }],
      ['lab', async () => { const { LabCommand } = await import('./serve'); return new LabCommand(this, this.env); }],
      ['g', 'generate'],
      ['s', 'serve'],
    ]);
  }

  async runCommand(argv: string[], env: { [key: string]: string; }): Promise<void> {
    const pargs = stripOptions(argv, {});

    const location = await this.locate(pargs);

    if (!isCommand(location.obj)) {
      const { showHelp } = await import('@ionic/cli-utils/lib/help');
      await this.env.telemetry.sendCommand('ionic help', pargs);
      return showHelp(this.env, pargs);
    }

    const command = location.obj;
    const metadata = await command.getMetadata();
    const fullNameParts = location.path.map(([p]) => p);

    if (metadata.options) {
      const optMap = metadataToCmdOptsEnv(metadata, fullNameParts.slice(1));

      // TODO: changes opt by reference, which is probably bad
      for (const [ opt, envvar ] of optMap.entries()) {
        const envdefault = env[envvar];

        if (typeof envdefault !== 'undefined') {
          opt.default = opt.type === Boolean ? (envdefault && envdefault !== '0' ? true : false) : envdefault;
        }
      }
    }

    const minimistOpts = metadataToParseArgsOptions(metadata);
    const options = parseArgs(lodash.drop(argv, location.path.length - 1), minimistOpts);
    const inputs = options._;

    if (!this.env.project.directory && metadata.type === 'project') {
      throw new FatalException(
        `Sorry! ${chalk.green(fullNameParts.join(' '))} can only be run in an Ionic project directory.\n` +
        `If this is a project you'd like to integrate with Ionic, create an ${chalk.bold(PROJECT_FILE)} file.`
      );
    }

    await command.execute(inputs, options, { location });
  }
}

export function metadataToCmdOptsEnv(metadata: CommandMetadata, cmdNameParts: string[]): Map<CommandMetadataOption, string> {
  const optMap = new Map<CommandMetadataOption, string>();

  if (!metadata.options) {
    return optMap;
  }

  const prefix = `IONIC_CMDOPTS_${cmdNameParts.map(s => s.toUpperCase()).join('_')}`;

  for (const option of metadata.options) {
    optMap.set(option, `${prefix}_${option.name.toUpperCase().split('-').join('_')}`);
  }

  return optMap;
}
