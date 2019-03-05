import * as Debug from 'debug';

import {BaseIntegration, IntegrationConfig} from '../';
import {
  InfoItem,
  IntegrationAddDetails, IntegrationAddHandlers,
  IntegrationName,
  ProjectIntegration,
  ProjectPersonalizationDetails
} from '../../../definitions';
import { copy, mkdirp, pathExists, readdirSafe, remove, stat } from '@ionic/utils-fs';
import * as lodash from 'lodash';
import * as os from 'os';
import * as path from 'path';
import chalk from 'chalk';

const debug = Debug('ionic:lib:integrations:cordova');

export class Integration extends BaseIntegration<ProjectIntegration> {
  readonly name: IntegrationName = 'cordova';
  readonly summary = 'Target native iOS and Android with Apache Cordova';
  readonly archiveUrl = 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz';


  get config(): IntegrationConfig {
    return new IntegrationConfig(this.e.project.filePath, {pathPrefix: ['integrations', this.name]});
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    const handlers: IntegrationAddHandlers = {
      conflictHandler: async (f, stats) => {
        const isDirectory = stats.isDirectory();
        const filename = `${path.basename(f)}${isDirectory ? '/' : ''}`;
        const type = isDirectory ? 'directory' : 'file';

        const confirm = await details.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `The ${chalk.cyan(filename)} ${type} exists in project. Overwrite?`,
          default: false,
        });

        return confirm;
      },
      onFileCreate: f => {
        if (!details.quiet) {
          details.env.log.msg(`${chalk.green('CREATE')} ${f}`);
        }
      },
    };
    const onFileCreate = handlers.onFileCreate ? handlers.onFileCreate : lodash.noop;
    const conflictHandler = handlers.conflictHandler ? handlers.conflictHandler : async () => false;

    const { createRequest, download } = await import('../../utils/http');
    const { tar } = await import('../../utils/archive');

    this.e.log.info(`Downloading integration ${chalk.green(this.name)}`);
    const tmpdir = path.resolve(os.tmpdir(), `ionic-integration-${this.name}`);

    // TODO: etag

    if (await pathExists(tmpdir)) {
      await remove(tmpdir);
    }

    await mkdirp(tmpdir);

    const ws = tar.extract({ cwd: tmpdir });
    const { req } = await createRequest('GET', this.archiveUrl, this.e.config.getHTTPConfig());
    await download(req, ws, {});

    const contents = await readdirSafe(tmpdir);
    const blacklist: string[] = [];

    debug(`Integration files downloaded to ${chalk.bold(tmpdir)} (files: ${contents.map(f => chalk.bold(f)).join(', ')})`);

    for (const f of contents) {
      const projectf = path.resolve(this.e.project.directory, f);

      try {
        const stats = await stat(projectf);
        const overwrite = await conflictHandler(projectf, stats);

        if (!overwrite) {
          blacklist.push(f);
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }

    this.e.log.info(`Copying integrations files to project`);
    debug(`Blacklist: ${blacklist.map(f => chalk.bold(f)).join(', ')}`);

    await mkdirp(details.root);

    await copy(tmpdir, details.root, {
      filter: f => {
        if (f === tmpdir) {
          return true;
        }

        const projectf = f.substring(tmpdir.length + 1);

        for (const item of blacklist) {
          if (item.slice(-1) === '/' && `${projectf}/` === item) {
            return false;
          }

          if (projectf.startsWith(item)) {
            return false;
          }
        }

        onFileCreate(projectf);

        return true;
      },
    });
    await super.add(details);
  }

  async getInfo(): Promise<InfoItem[]> {
    const { getAndroidSdkToolsVersion } = await import('./android');

    const [
      cordovaVersion,
      cordovaPlatforms,
      cordovaPlugins,
      xcode,
      iosDeploy,
      iosSim,
      androidSdkToolsVersion,
    ] = await Promise.all([
      this.getCordovaVersion(),
      this.getCordovaPlatformVersions(),
      this.getCordovaPluginVersions(),
      this.getXcodebuildVersion(),
      this.getIOSDeployVersion(),
      this.getIOSSimVersion(),
      getAndroidSdkToolsVersion(),
    ]);

    const info: InfoItem[] = [
      { group: 'cordova', key: 'cordova', flair: 'Cordova CLI', value: cordovaVersion || 'not installed' },
      { group: 'cordova', key: 'Cordova Platforms', value: cordovaPlatforms },
      { group: 'cordova', key: 'Cordova Plugins', value: cordovaPlugins },
    ];

    if (xcode) {
      info.push({ group: 'system', key: 'Xcode', value: xcode });
    }

    if (iosDeploy) {
      info.push({ group: 'system', key: 'ios-deploy', value: iosDeploy });
    }

    if (iosSim) {
      info.push({ group: 'system', key: 'ios-sim', value: iosSim });
    }

    if (androidSdkToolsVersion) {
      info.push({ group: 'system', key: 'Android SDK Tools', value: androidSdkToolsVersion });
    }

    return info;
  }

  async personalize({ name, packageId }: ProjectPersonalizationDetails) {
    const { loadConfigXml } = await import('./config');

    const integration = this.e.project.requireIntegration('cordova');
    const conf = await loadConfigXml(integration);

    conf.setName(name);

    if (packageId) {
      conf.setBundleId(packageId);
    }

    await conf.save();
  }

  async getCordovaVersion(): Promise<string | undefined> {
    try {
      const integration = this.e.project.requireIntegration('cordova');
      return this.e.shell.cmdinfo('cordova', ['-v', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root });
    } catch (e) {
      debug('Error while getting Cordova version: %O', e);
    }
  }

  async getCordovaPlatformVersions(): Promise<string> {
    try {
      const integration = this.e.project.requireIntegration('cordova');
      const output = await this.e.shell.output('cordova', ['platform', 'ls', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root, showCommand: false });
      const platforms = output
        .replace('Installed platforms:', '')
        .replace(/Available platforms[\s\S]+/, '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('.'));

      if (platforms.length === 0) {
        return 'none';
      }

      return platforms.join(', ');
    } catch (e) {
      debug('Error while getting Cordova platforms: %O', e);
      return 'not available';
    }
  }

  async getCordovaPluginVersions(): Promise<string> {
    const whitelist = [
      /^cordova-plugin-ionic$/,
      /^cordova-plugin-ionic-.+/,
    ];

    try {
      const integration = this.e.project.requireIntegration('cordova');
      const output = await this.e.shell.output('cordova', ['plugin', 'ls', '--no-telemetry', '--no-update-notifier'], { cwd: integration.root, showCommand: false });
      const pluginRe = /^([a-z-]+)\s+(\d\.\d\.\d).+$/;
      const plugins = output
        .split('\n')
        .map(l => l.trim().match(pluginRe))
        .filter((l): l is RegExpMatchArray => l !== null)
        .map(m => [m[1], m[2]]);

      const whitelistedPlugins = plugins
        .filter(([ plugin, version ]) => whitelist.some(re => re.test(plugin)))
        .map(([ plugin, version ]) => `${plugin} ${version}`);

      const count = plugins.length - whitelistedPlugins.length;

      if (whitelistedPlugins.length === 0) {
        return `no whitelisted plugins (${count} plugins total)`;
      }

      return `${whitelistedPlugins.join(', ')}${count > 0 ? `, (and ${count} other plugins)` : ''}`;
    } catch (e) {
      debug('Error while getting Cordova plugins: %O', e);
      return 'not available';
    }
  }

  async getXcodebuildVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('xcodebuild', ['-version']);
  }

  async getIOSDeployVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('ios-deploy', ['--version']);
  }

  async getIOSSimVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('ios-sim', ['--version']);
  }
}
