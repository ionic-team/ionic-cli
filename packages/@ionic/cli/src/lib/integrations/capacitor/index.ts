import { parseArgs } from '@ionic/cli-framework';
import { mkdirp, pathExists } from '@ionic/utils-fs';
import { prettyPath } from '@ionic/utils-terminal';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as path from 'path';

const debug = Debug('ionic:lib:integrations:capacitor');

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
    srcMainDirAbs: string;
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

  get root(): string {
    return this.config.get('root', this.e.project.directory);
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

        name = String(parsedArgs._[0]) || name;
        packageId = parsedArgs._[1] || packageId;

        if (parsedArgs['web-dir']) {
          webDir = parsedArgs['web-dir'];
        }
      }

      options.push('--web-dir', webDir);

      await this.installCapacitorCore();
      await this.installCapacitorCLI();
      await this.installCapacitorPlugins()

      await mkdirp(details.root);
      await this.e.shell.run('capacitor', ['init', name, packageId, ...options], { cwd: details.root });
    }

    await super.add(details);
  }

  protected getCapacitorConfigJsonPath(): string {
    return path.resolve(this.root, 'capacitor.config.json');
  }

  async installCapacitorCore() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/core@latest' });
    await this.e.shell.run(manager, managerArgs, { cwd: this.root });
  }

  async installCapacitorCLI() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: '@capacitor/cli@latest', saveDev: true });
    await this.e.shell.run(manager, managerArgs, { cwd: this.root });
  }

  async installCapacitorPlugins() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: ['@capacitor/haptics', '@capacitor/app', '@capacitor/keyboard', '@capacitor/status-bar'] });
    await this.e.shell.run(manager, managerArgs, { cwd: this.root });
  }

  async personalize({ name, packageId }: ProjectPersonalizationDetails) {
    const confPath = this.getCapacitorConfigJsonPath();
    if (await pathExists(confPath)) {
      const conf = new CapacitorJSONConfig(confPath);

      conf.set('appName', name);

      if (packageId) {
        conf.set('appId', packageId);
      }
    }
  }

  async getInfo(): Promise<InfoItem[]> {
    const conf = await this.getCapacitorConfig();
    const bundleId = conf?.appId;

    const [
      [ capacitorCorePkg, capacitorCorePkgPath ],
      capacitorCLIVersion,
      [ capacitorIOSPkg, capacitorIOSPkgPath ],
      [ capacitorAndroidPkg, capacitorAndroidPkgPath ],
    ] = await (Promise.all([
      this.e.project.getPackageJson('@capacitor/core'),
      this.getCapacitorCLIVersion(),
      this.e.project.getPackageJson('@capacitor/ios'),
      this.e.project.getPackageJson('@capacitor/android'),
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
        name: '@capacitor/ios',
        key: 'capacitor_ios_version',
        value: capacitorIOSPkg ? capacitorIOSPkg.version : 'not installed',
        path: capacitorIOSPkgPath,
      },
      {
        group: 'capacitor',
        name: '@capacitor/android',
        key: 'capacitor_android_version',
        value: capacitorAndroidPkg ? capacitorAndroidPkg.version : 'not installed',
        path: capacitorAndroidPkgPath,
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

  getCapacitorCLIVersion = lodash.memoize(async (): Promise<string | undefined> => {
    return this.e.shell.cmdinfo('capacitor', ['--version'], { cwd: this.root });
  });

  getCapacitorCLIConfig = lodash.memoize(async (): Promise<CapacitorCLIConfig | undefined> => {
    const args = ['config', '--json'];

    debug('Getting config with Capacitor CLI: %O', args);

    const output = await this.e.shell.cmdinfo('capacitor', args, { cwd: this.root });

    if (!output) {
      debug('Could not get config from Capacitor CLI (probably old version)');
      return;
    } else {
      try {
        // Capacitor 1 returns the `command not found` error in stdout instead of stderror like in Capacitor 2
        // This ensures that the output from the command is valid JSON to account for this
        return JSON.parse(output);
      } catch(e) {
        debug('Could not get config from Capacitor CLI (probably old version)', e);
        return;
      }
    }
  });

  getCapacitorConfig = lodash.memoize(async (): Promise<CapacitorConfig | undefined> => {
    const cli = await this.getCapacitorCLIConfig();

    if (cli) {
      debug('Loaded Capacitor config!');
      return cli.app.extConfig;
    }

    // fallback to reading capacitor.config.json if it exists
    const confPath = this.getCapacitorConfigJsonPath();

    if (!(await pathExists(confPath))) {
      debug('Capacitor config file does not exist at %O', confPath);
      debug('Failed to load Capacitor config');
      return;
    }

    const conf = new CapacitorJSONConfig(confPath);
    const extConfig = conf.c;

    debug('Loaded Capacitor config!');

    return extConfig;
  });
}
