import { IProject, IonicEnvironment } from '../definitions';
import { CommandMap, Namespace, NamespaceMap } from '../lib/namespace';

export interface IonicEnvironmentDeps {
  readonly env: IonicEnvironment;
  readonly project?: IProject;
}

export class IonicNamespace extends Namespace {
  protected _env: IonicEnvironment;
  protected _project: IProject | undefined;

  constructor({ env, project }: IonicEnvironmentDeps) {
    super(undefined);
    this._env = env;
    this._project = project;
  }

  get project(): IProject | undefined {
    return this._project;
  }

  set project(p: IProject | undefined) {
    this._project = p;
  }

  get env(): IonicEnvironment {
    return this._env;
  }

  set env(env: IonicEnvironment) {
    this._env = env;
  }

  async getMetadata() {
    return {
      name: 'ionic',
      summary: '',
    };
  }

  async getNamespaces(): Promise<NamespaceMap> {
    return new NamespaceMap([
      ['appflow', async () => { const { AppflowNamespace } = await import('./appflow/index'); return new AppflowNamespace(this); }],
      ['config', async () => { const { ConfigNamespace } = await import('./config/index'); return new ConfigNamespace(this); }],
      ['cordova', async () => { const { CordovaNamespace } = await import('./cordova/index'); return new CordovaNamespace(this); }],
      ['capacitor', async () => { const { CapacitorNamespace } = await import('./capacitor/index'); return new CapacitorNamespace(this); }],
      ['deploy', async () => { const { DeployNamespace } = await import('./deploy/index'); return new DeployNamespace(this); }],
      ['git', async () => { const { GitNamespace } = await import('./git/index'); return new GitNamespace(this); }],
      ['ssl', async () => { const { SSLNamespace } = await import('./ssl/index'); return new SSLNamespace(this); }],
      ['ssh', async () => { const { SSHNamespace } = await import('./ssh/index'); return new SSHNamespace(this); }],
      ['monitoring', async () => { const { MonitoringNamespace } = await import('./monitoring/index'); return new MonitoringNamespace(this); }],
      ['doctor', async () => { const { DoctorNamespace } = await import('./doctor/index'); return new DoctorNamespace(this); }],
      ['integrations', async () => { const { IntegrationsNamespace } = await import('./integrations/index'); return new IntegrationsNamespace(this); }],
      ['cap', 'capacitor'],
    ]);
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['docs', async () => { const { DocsCommand } = await import('./docs'); return new DocsCommand(this); }],
      ['generate', async () => { const { GenerateCommand } = await import('./generate'); return new GenerateCommand(this); }],
      ['help', async () => { const { HelpCommand } = await import('./help'); return new HelpCommand(this); }],
      ['info', async () => { const { InfoCommand } = await import('./info'); return new InfoCommand(this); }],
      ['init', async () => { const { InitCommand } = await import('./init'); return new InitCommand(this); }],
      ['ionitron', async () => { const { IonitronCommand } = await import('./ionitron'); return new IonitronCommand(this); }],
      ['link', async () => { const { LinkCommand } = await import('./link'); return new LinkCommand(this); }],
      ['login', async () => { const { LoginCommand } = await import('./login'); return new LoginCommand(this); }],
      ['logout', async () => { const { LogoutCommand } = await import('./logout'); return new LogoutCommand(this); }],
      ['repair', async () => { const { RepairCommand } = await import('./repair'); return new RepairCommand(this); }],
      ['serve', async () => { const { ServeCommand } = await import('./serve'); return new ServeCommand(this); }],
      ['share', async () => { const { ShareCommand } = await import('./share'); return new ShareCommand(this); }],
      ['signup', async () => { const { SignupCommand } = await import('./signup'); return new SignupCommand(this); }],
      ['start', async () => { const { StartCommand } = await import('./start'); return new StartCommand(this); }],
      ['state', async () => { const { StateCommand } = await import('./state'); return new StateCommand(this); }],
      ['telemetry', async () => { const { TelemetryCommand } = await import('./telemetry'); return new TelemetryCommand(this); }],
      ['version', async () => { const { VersionCommand } = await import('./version'); return new VersionCommand(this); }],
      ['lab', async () => { const { LabCommand } = await import('./serve'); return new LabCommand(this); }],
      ['g', 'generate'],
      ['s', 'serve'],
    ]);
  }
}
