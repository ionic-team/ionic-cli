import { CommandMap, Namespace, NamespaceMap } from '@ionic/cli-utils/lib/namespace';

export class IonicNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic',
      summary: '',
    };
  }

  async getNamespaces(): Promise<NamespaceMap> {
    return new NamespaceMap([
      ['config', async () => { const { ConfigNamespace } = await import('./config/index'); return new ConfigNamespace(this, this.env, this.project); }],
      ['cordova', async () => { const { CordovaNamespace } = await import('./cordova/index'); return new CordovaNamespace(this, this.env, this.project); }],
      ['capacitor', async () => { const { CapacitorNamespace } = await import('./capacitor/index'); return new CapacitorNamespace(this, this.env, this.project); }],
      ['deploy', async () => { const { DeployNamespace } = await import('./deploy/index'); return new DeployNamespace(this, this.env, this.project); }],
      ['git', async () => { const { GitNamespace } = await import('./git/index'); return new GitNamespace(this, this.env, this.project); }],
      ['ssl', async () => { const { SSLNamespace } = await import('./ssl/index'); return new SSLNamespace(this, this.env, this.project); }],
      ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(this, this.env, this.project); }],
      ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(this, this.env, this.project); }],
      ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(this, this.env, this.project); }],
      ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(this, this.env, this.project); }],
      ['cap', 'capacitor'],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this, this.env, this.project); }],
      ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(this, this.env, this.project); }],
      ['generate', async () => { const { GenerateCommand } = await import('./generate'); return new GenerateCommand(this, this.env, this.project); }],
      ['help', async () => { const { HelpCommand } = await import('./help'); return new HelpCommand(this, this.env, this.project); }],
      ['info', async () => { const { InfoCommand } = await import('./info'); return new InfoCommand(this, this.env, this.project); }],
      ['ionitron', async () => { const { IonitronCommand } = await import('./ionitron'); return new IonitronCommand(this, this.env, this.project); }],
      ['link', async () => { const { LinkCommand } = await import('./link'); return new LinkCommand(this, this.env, this.project); }],
      ['login', async () => { const { LoginCommand } = await import('./login'); return new LoginCommand(this, this.env, this.project); }],
      ['logout', async () => { const { LogoutCommand } = await import('./logout'); return new LogoutCommand(this, this.env, this.project); }],
      ['serve', async () => { const { ServeCommand } = await import('./serve'); return new ServeCommand(this, this.env, this.project); }],
      ['share', async () => { const { ShareCommand } = await import('./share'); return new ShareCommand(this, this.env, this.project); }],
      ['signup', async () => { const { SignupCommand } = await import('./signup'); return new SignupCommand(this, this.env, this.project); }],
      ['start', async () => { const { StartCommand } = await import('./start'); return new StartCommand(this, this.env, this.project); }],
      ['state', async () => { const { StateCommand } = await import('./state'); return new StateCommand(this, this.env, this.project); }],
      ['telemetry', async () => { const { TelemetryCommand } = await import('./telemetry'); return new TelemetryCommand(this, this.env, this.project); }],
      ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(this, this.env, this.project); }],
      ['lab', async () => { const { LabCommand } = await import('./serve'); return new LabCommand(this, this.env, this.project); }],
      ['g', 'generate'],
      ['s', 'serve'],
    ]);
  }
}
