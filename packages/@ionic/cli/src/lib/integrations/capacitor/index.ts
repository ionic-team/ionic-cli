import { PackageJson, parseArgs } from '@ionic/cli-framework';
import { mkdirp, pathExists } from '@ionic/utils-fs';
import { prettyPath } from '@ionic/utils-terminal';
import * as chalk from 'chalk';
import * as path from 'path';

import { BaseIntegration, IntegrationConfig } from '../';
import {
  InfoItem,
  IntegrationAddDetails,
  IntegrationName,
  ProjectIntegration,
  ProjectPersonalizationDetails
} from '../../../definitions';
import { input, strong } from '../../color';
import { pkgManagerArgs } from '../../utils/npm';

import { CapacitorJSONConfig, CapacitorConfig } from './config';

export interface CapacitorCLIConfig {
  android: {
    platformDirAbs: string;
    srcDirAbs: string;
    assetsDirAbs: string;
  };
  ios: {
    platformDirAbs: string;
    nativeTargetDirAbs: string;
  };
  app: {
    extConfig: CapacitorConfig;
  }
}

export class Integration extends BaseIntegration<ProjectIntegration> {
  readonly name: IntegrationName = 'capacitor';
  readonly summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
  readonly archiveUrl = undefined;

  get config(): IntegrationConfig {
    return new IntegrationConfig(this.e.project.filePath, { pathPrefix: [...this.e.project.pathPrefix, 'integrations', this.name] });
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    const confPath = this.getCapacitorConfigJsonPath();

    if (await pathExists(confPath)) {
      this.e.log.nl();
      this.e.log.warn(
        `Capacitor already exists in project.\n` +
        `Since the Capacitor config already exists (${strong(prettyPath(confPath))}), the Capacitor integration has been ${chalk.green('enabled')}.\n\n` +
        `You can re-integrate this project by doing the following:\n\n` +
        `- Run ${input(`ionic integrations disable ${this.name}`)}\n` +
        `- Remove the ${strong(prettyPath(confPath))} file\n` +
        `- Run ${input(`ionic integrations enable ${this.name} --add`)}\n`
      );
    } else {
      let name = this.e.project.config.get('name');
      let packageId = 'io.ionic.starter';
      let webDir = await this.e.project.getDefaultDistDir();

      const options: string[] = [];

      if (details.enableArgs && details.enableArgs.length > 0) {
        const parsedArgs = parseArgs(details.enableArgs);

        name = parsedArgs._[0] || name;
        packageId = parsedArgs._[1] || packageId;

        if (parsedArgs['web-dir']) {
          webDir = parsedArgs['web-dir'];
        }
      }

      options.push('--web-dir', webDir);
      options.push('--npm-client', this.e.config.get('npmClient'));

      await this.installCapacitorCore();
      await this.installCapacitorCLI();

      await mkdirp(details.root);
      await this.e.shell.run('capacitor', ['init', name, packageId, ...options], { cwd: details.root });
    }

    await super.add(details);
  }

  protected getCapacitorConfigJsonPath(): string {
    return path.resolve(this.config.get('root', this.e.project.directory), 'capacitor.config.json');
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
    const confPath = this.getCapacitorConfigJsonPath();
    const conf = new CapacitorJSONConfig(confPath);

    conf.set('appName', name);

    if (packageId) {
      conf.set('appId', packageId);
    }
  }

  async getInfo(): Promise<InfoItem[]> {
    const conf = await this.getCapacitorConfig();
    const bundleId = conf?.appId;

    const [
      [ capacitorCorePkg, capacitorCorePkgPath ],
      capacitorCLIVersion,
    ] = await (Promise.all<[PackageJson | undefined, string | undefined], string | undefined>([
      this.e.project.getPackageJson('@capacitor/core'),
      this.getCapacitorCLIVersion(),
    ]));

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

  async getCapacitorCLIConfig(): Promise<CapacitorCLIConfig | undefined> {
    const output = await this.e.shell.cmdinfo('capacitor', ['config', '--json'], { cwd: this.e.project.directory });

    if (output) {
      return JSON.parse(output);
    }
  }

  async getCapacitorConfig(): Promise<CapacitorConfig | undefined> {
    // try using `capacitor config --json`
    const cli = await this.getCapacitorCLIConfig();

    if (cli) {
      return cli.app.extConfig;
    }

    const confPath = this.getCapacitorConfigJsonPath();

      // fallback to reading capacitor.config.json if it exists
    if (await pathExists(confPath)) {
      const conf = new CapacitorJSONConfig(confPath);
      return conf.c;
    }
  }
}
