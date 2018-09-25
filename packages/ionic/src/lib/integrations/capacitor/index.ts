import * as path from 'path';

import { BaseIntegration } from '../';
import { IIntegrationAddOptions, InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../../definitions';
import { pkgManagerArgs } from '../../utils/npm';

import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from './config';

export class Integration extends BaseIntegration {
  readonly name: IntegrationName = 'capacitor';
  readonly summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
  readonly archiveUrl = undefined;

  async add(options?: IIntegrationAddOptions): Promise<void> {
    let name = this.e.project.config.get('name');
    let packageId = 'io.ionic.starter';

    if (options && options.enableArgs) {
      if (options.enableArgs[0]) {
        name = options.enableArgs[0];
      }

      if (options.enableArgs[1]) {
        packageId = options.enableArgs[1];
      }
    }

    await this.installCapacitorCore();
    await this.installCapacitorCLI();

    await this.e.shell.run('capacitor', ['init', name, packageId], { cwd: this.e.project.directory });

    await super.add(options);
  }

  async installCapacitorCore() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/core' });
    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });
  }

  async installCapacitorCLI() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/cli' });
    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });
  }

  async personalize({ name, packageId }: ProjectPersonalizationDetails) {
    const conf = new CapacitorConfig(path.resolve(this.e.project.directory, CAPACITOR_CONFIG_FILE));

    conf.set('appName', name);

    if (packageId) {
      conf.set('appId', packageId);
    }
  }

  async getInfo(): Promise<InfoItem[]> {
    const [
      [ capacitorCorePkg, capacitorCorePkgPath ],
      capacitorCLIVersion,
    ] = await Promise.all([
      this.e.project.getPackageJson('@capacitor/core'),
      this.getCapacitorCLIVersion(),
    ]);

    const info: InfoItem[] = [
      { group: 'capacitor', key: 'capacitor', flair: 'Capacitor CLI', value: capacitorCLIVersion || 'not installed' },
      { group: 'capacitor', key: '@capacitor/core', value: capacitorCorePkg ? capacitorCorePkg.version : 'not installed', path: capacitorCorePkgPath },
    ];

    return info;
  }

  async getCapacitorCLIVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('capacitor', ['--version'], { cwd: this.e.project.directory });
  }
}
