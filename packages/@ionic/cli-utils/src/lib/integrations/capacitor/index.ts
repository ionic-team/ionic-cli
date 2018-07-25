import { BaseIntegration } from '../';
import { IIntegrationAddOptions, InfoItem, IntegrationName } from '../../../definitions';
import { pkgManagerArgs } from '../../utils/npm';

export class Integration extends BaseIntegration {
  readonly name: IntegrationName = 'capacitor';
  readonly summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
  readonly archiveUrl = undefined;

  async add(options?: IIntegrationAddOptions): Promise<void> {
    await this.installCapacitorCore();
    await this.installCapacitorCLI();

    await this.shell.run('capacitor', ['init', this.project.config.get('name'), 'io.ionic.starter'], { cwd: this.project.directory });

    await super.add(options);
  }

  async installCapacitorCore() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'install', pkg: '@capacitor/core' });
    await this.shell.run(manager, managerArgs, { cwd: this.project.directory });
  }

  async installCapacitorCLI() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'install', pkg: '@capacitor/cli' });
    await this.shell.run(manager, managerArgs, { cwd: this.project.directory });
  }

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ capacitorCorePkg, capacitorCorePkgPath ],
      capacitorCLIVersion,
    ] = await Promise.all([
      this.project.getPackageJson('@capacitor/core'),
      this.getCapacitorCLIVersion(),
    ]);

    const info: InfoItem[] = [
      { group: 'capacitor', key: 'capacitor', flair: 'Capacitor CLI', value: capacitorCLIVersion || 'not installed' },
      { group: 'capacitor', key: '@capacitor/core', value: capacitorCorePkg ? capacitorCorePkg.version : 'not installed', path: capacitorCorePkgPath },
    ];

    return info;
  }

  async getCapacitorCLIVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('capacitor', ['--version'], { cwd: this.project.directory });
  }
}
