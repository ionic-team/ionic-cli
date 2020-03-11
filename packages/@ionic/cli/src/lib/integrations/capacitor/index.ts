import { PackageJson, parseArgs } from '@ionic/cli-framework';
import { mkdirp } from '@ionic/utils-fs';
import * as path from 'path';

import { BaseIntegration, IntegrationConfig } from '../';
import {
  InfoItem,
  IntegrationAddDetails,
  IntegrationName,
  ProjectIntegration,
  ProjectPersonalizationDetails
} from '../../../definitions';
import { pkgManagerArgs } from '../../utils/npm';

import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from './config';

export class Integration extends BaseIntegration<ProjectIntegration> {
  readonly name: IntegrationName = 'capacitor';
  readonly summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
  readonly archiveUrl = undefined;

  get config(): IntegrationConfig {
    return new IntegrationConfig(this.e.project.filePath, { pathPrefix: [...this.e.project.pathPrefix, 'integrations', this.name] });
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    let name = this.e.project.config.get('name');
    let packageId = 'io.ionic.starter';
    const options: string[] = [];

    if (this.e.project.type === 'react') {
      options.push('--web-dir', 'build');
    } else if (this.e.project.type === 'vue') {
      options.push('--web-dir', 'dist');
    }

    if (details.enableArgs) {
      const parsedArgs = parseArgs(details.enableArgs);

      name = parsedArgs._[0] || name;
      packageId = parsedArgs._[1] || packageId;
      if (parsedArgs['web-dir']) {
        options.push('--web-dir', parsedArgs['web-dir']);
      }
      options.push('--npm-client', this.e.config.get('npmClient'));
    }

    await this.installCapacitorCore();
    await this.installCapacitorCLI();

    await mkdirp(details.root);
    await this.e.shell.run('capacitor', ['init', name, packageId, ...options], { cwd: details.root });

    await super.add(details);
  }

  async getConfig(): Promise<CapacitorConfig> {
    const conf = new CapacitorConfig(path.resolve(this.e.project.directory, CAPACITOR_CONFIG_FILE));

    return conf;
  }

  async installCapacitorCore() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/core' });
    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });
  }

  async installCapacitorCLI() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/cli', saveDev: true });
    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });
  }

  async personalize({ name, packageId }: ProjectPersonalizationDetails) {
    const conf = await this.getConfig();

    conf.set('appName', name);

    if (packageId) {
      conf.set('appId', packageId);
    }
  }

  async getInfo(): Promise<InfoItem[]> {
    const conf = await this.getConfig();
    const bundleId = conf.get('appId');

    const [
      [ capacitorCorePkg, capacitorCorePkgPath ],
      capacitorCLIVersion,
    ] = await (Promise.all([
      this.e.project.getPackageJson('@capacitor/core'),
      this.getCapacitorCLIVersion(),
    ]) as Promise<[[PackageJson | undefined, string], string | undefined]>); // TODO: https://github.com/microsoft/TypeScript/issues/33752

    const info: InfoItem[] = [
      {
        group: 'capacitor',
        name: 'Capacitor CLI',
        key: 'capacitor_cli_version',
        value: capacitorCLIVersion || 'not installed',
      },
      {
        group: 'capacitor',
        name: '@capacitor/core',
        key: 'capacitor_core_version',
        value: capacitorCorePkg ? capacitorCorePkg.version : 'not installed',
        path: capacitorCorePkgPath,
      },
      {
        group: 'capacitor',
        name: 'Bundle ID',
        key: 'bundle_id',
        value: bundleId || 'unknown',
        hidden: true,
      },
    ];

    return info;
  }

  async getCapacitorCLIVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('capacitor', ['--version'], { cwd: this.e.project.directory });
  }
}
