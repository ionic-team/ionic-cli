import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';
import * as semver from 'semver';

import { fsReadDir, fsReadFile } from '@ionic/cli-framework/utils/fs';
import { compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/npm';

import { IAilmentRegistry, TreatableAilment } from '../../../definitions';
import { AppClient } from '../../app';
import { getIonicRemote, isRepoInitialized } from '../../git';
import { loadConfigXml } from '../../integrations/cordova/config';
import { getPlatforms } from '../../integrations/cordova/project';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';

import { Ailment, AilmentDeps } from './base';

export * from './base';
export * from './utils';

export async function registerAilments(registry: IAilmentRegistry, deps: AilmentDeps): Promise<void> {
  registry.register(new NpmInstalledLocally(deps));
  registry.register(new IonicCLIInstalledLocally(deps));
  registry.register(new GitNotUsed(deps));
  registry.register(new GitConfigInvalid(deps));
  registry.register(new IonicNativeUpdateAvailable(deps));
  registry.register(new IonicNativeMajorUpdateAvailable(deps));
  registry.register(new IonicNativeOldVersionInstalled(deps));
  registry.register(new UnsavedCordovaPlatforms(deps));
  registry.register(new DefaultCordovaBundleIdUsed(deps));
  registry.register(new ViewportFitNotSet(deps));
  registry.register(new CordovaPlatformsCommitted(deps));
}

class NpmInstalledLocally extends Ailment implements TreatableAilment {
  readonly id = 'npm-installed-locally';
  readonly treatable = true;

  async getMessage() {
    return (
      `${chalk.bold('npm')} is installed locally.\n` +
      `${chalk.bold('npm')} is typically installed globally and may cause some confusion about versions when other CLIs use it.\n`
    ).trim();
  }

  async detected() {
    return !(lodash.attempt(() => resolve('npm', { paths: compileNodeModulesPaths(this.project.directory) })) instanceof Error);
  }

  async getTreatmentSteps() {
    const config = await this.config.load();
    const { npmClient } = config;
    const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { command: 'uninstall', pkg: 'npm' });

    return [
      {
        message: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      },
    ];
  }
}

class IonicCLIInstalledLocally extends Ailment implements TreatableAilment {
  readonly id = 'ionic-installed-locally';
  readonly treatable = true;

  async getMessage() {
    return (
      `The Ionic CLI is installed locally.\n` +
      `While the CLI can run locally, there's no longer a reason to have it installed locally and it may cause some confusion over configuration and versions.\n`
    ).trim();
  }

  async detected() {
    return !(lodash.attempt(() => resolve('ionic', { paths: compileNodeModulesPaths(this.project.directory) })) instanceof Error);
  }

  async getTreatmentSteps() {
    const config = await this.config.load();
    const { npmClient } = config;
    const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { command: 'uninstall', pkg: 'ionic' });

    return [
      {
        message: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      },
    ];
  }
}

class GitNotUsed extends Ailment {
  readonly id = 'git-not-used';

  async getMessage() {
    return (
      `Git doesn't appear to be in use.\n` +
      `We highly recommend using source control software such as git (${chalk.bold('https://git-scm.com')}) to track changes in your code throughout time.\n`
    ).trim();
  }

  async detected() {
    if (!(await isRepoInitialized(this.project.directory))) {
      return true;
    }

    const cmdInstalled = await this.shell.cmdinfo('git', ['--version']);

    if (!cmdInstalled) {
      return true;
    }

    const [ revListCount, status ] = await Promise.all([
      this.shell.output('git', ['rev-list', '--count', 'HEAD'], { fatalOnError: false, showCommand: false, showError: false }),
      this.shell.output('git', ['status', '--porcelain'], { fatalOnError: false, showCommand: false, showError: false }),
    ]);

    this.debug('rev-list count: %s, status: %s', revListCount.trim(), status);

    if (!revListCount) {
      return true;
    }

    const commitCount = Number(revListCount);
    const changes = Boolean(status);

    return commitCount === 1 && changes;
  }

  async getTreatmentSteps() {
    return [
      { message: `Download git if you don't have it installed: ${chalk.bold('https://git-scm.com/downloads')}` },
      { message: `Learn the basics if you're unfamiliar with git: ${chalk.bold('https://try.github.io')}` },
      { message: `Make your first commit and start tracking code changes! 😍` },
    ];
  }
}

class GitConfigInvalid extends Ailment {
  readonly id = 'git-config-invalid';

  async getMessage() {
    const proId = await this.project.requireProId();

    return (
      `App linked to ${chalk.bold(proId)} with invalid git configuration.\n` +
      `This app is linked to an app on Ionic (${chalk.bold(proId)}), but the git configuration is not valid.\n`
    ).trim();
  }

  async detected() {
    const isLoggedIn = await this.session.isLoggedIn();

    if (!isLoggedIn) {
      return false;
    }

    const projectConfig = await this.project.load();
    const proId = projectConfig.pro_id;

    if (!proId) {
      return false;
    }

    if (!(await isRepoInitialized(this.project.directory))) {
      return false;
    }

    const remote = await getIonicRemote({ shell: this.shell }, this.project.directory);

    if (!remote) {
      return true;
    }

    const token = await this.session.getUserToken();
    const appClient = new AppClient({ token, client: this.client });
    const app = await appClient.load(proId);

    if (app.repo_url !== remote) {
      return true;
    }

    return false;
  }

  async getTreatmentSteps() {
    return [
      { message: `Run: ${chalk.green('ionic git remote')}` },
    ];
  }
}

class IonicNativeUpdateAvailable extends Ailment implements TreatableAilment {
  readonly id = 'ionic-native-update-available';
  readonly treatable = true;
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      try {
        const pkgPath = resolve('@ionic-native/core/package', { paths: compileNodeModulesPaths(this.project.directory) });
        this.currentVersion = (await readPackageJsonFile(pkgPath)).version;
      } catch (e) {
        // Not installed
      }

      const pkg = await pkgFromRegistry(npmClient, { pkg: '@ionic-native/core' });
      this.latestVersion = pkg ? pkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Update available for Ionic Native.\n` +
      `An update is available for Ionic Native (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'minor' || diff === 'patch';
  }

  async getTreatmentSteps() {
    const config = await this.config.load();
    const { npmClient } = config;
    const [ , latestVersion ] = await this.getVersionPair();

    const modulePath = path.dirname(path.dirname(resolve('@ionic-native/core/package', { paths: compileNodeModulesPaths(this.project.directory) })));
    const modules = await fsReadDir(modulePath);

    return Promise.all(modules.filter(m => m).map(async m => {
      const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { command: 'install', pkg: `@ionic-native/${m}@${latestVersion ? latestVersion : 'latest'}` });

      return {
        message: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      };
    }));
  }
}

class IonicNativeMajorUpdateAvailable extends Ailment {
  readonly id = 'ionic-native-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      try {
        const pkgPath = resolve('@ionic-native/core/package', { paths: compileNodeModulesPaths(this.project.directory) });
        this.currentVersion = (await readPackageJsonFile(pkgPath)).version;
      } catch (e) {
        // Not installed
      }

      const pkg = await pkgFromRegistry(npmClient, { pkg: '@ionic-native/core' });
      this.latestVersion = pkg ? pkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Major update available for Ionic Native.\n` +
      `A major update is available for Ionic Native (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    const config = await this.config.load();
    const { npmClient } = config;
    const [ , latestVersion ] = await this.getVersionPair();
    const args = await pkgManagerArgs(npmClient, { command: 'install', pkg: `@ionic-native/core@${latestVersion ? latestVersion : 'latest'}` });

    return [
      { message: `Visit ${chalk.bold('https://github.com/ionic-team/ionic-native/releases')}, looking for breaking changes` },
      { message: `Update each ${chalk.bold('@ionic-native/')} package. For example, ${chalk.green(args.join(' '))}` },
      { message: `Update your app according to the breaking changes, if any` },
    ];
  }
}

class IonicNativeOldVersionInstalled extends Ailment {
  readonly id = 'ionic-native-old-version-installed';

  async getMessage() {
    return (
      `Old version of Ionic Native installed.\n` +
      `Ionic Native ${chalk.bold('ionic-native')} has been restructured into individual packages under the ${chalk.bold('@ionic-native/')} namespace to allow for better bundling and faster apps.\n`
    ).trim();
  }

  async detected() {
    return !(lodash.attempt(() => resolve('ionic-native', { paths: compileNodeModulesPaths(this.project.directory) })) instanceof Error);
  }

  async getTreatmentSteps() {
    const config = await this.config.load();
    const { npmClient } = config;
    const args = await pkgManagerArgs(npmClient, { command: 'uninstall', pkg: 'ionic-native' });

    return [
      { message: `Run ${chalk.green(args.join(' '))}` },
      { message: `Refer to ${chalk.bold('https://ionicframework.com/docs/native')} for installation & usage instructions` },
    ];
  }
}

class UnsavedCordovaPlatforms extends Ailment {
  readonly id = 'unsaved-cordova-platforms';

  async getMessage() {
    return (
      `Cordova platforms unsaved.\n` +
      `There are Cordova platforms installed that are not saved in ${chalk.bold('config.xml')} or ${chalk.bold('package.json')}. It is good practice to manage Cordova platforms and their versions. See the Cordova docs${chalk.cyan('[1]')} for more information.\n\n` +
      `${chalk.cyan('[1]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')}\n`
    ).trim();
  }

  async detected() {
    await this.project.load();
    let cordova;

    try {
      cordova = await this.project.getIntegration('cordova');
    } catch (e) {
      return false;
    }

    const platforms = await getPlatforms(cordova.root);
    const conf = await loadConfigXml({ project: this.project });
    const engines = conf.getPlatformEngines();
    const engineNames = new Set([...engines.map(e => e.name)]);

    const configXmlDiff = platforms.filter(p => !engineNames.has(p));

    return configXmlDiff.length > 0;
  }

  async getTreatmentSteps() {
    return [
      { message: `Run: ${chalk.green('ionic cordova platform save')}` },
    ];
  }
}

class DefaultCordovaBundleIdUsed extends Ailment {
  readonly id = 'default-cordova-bundle-id-used';

  async getMessage() {
    return (
      `Package ID unchanged in ${chalk.bold('config.xml')}.\n` +
      `The Package Identifier (AKA "Bundle ID" for iOS and "Application ID" for Android) is a unique ID (usually written in reverse DNS notation, such as ${chalk.bold('com.mycompany.MyApp')}) that Cordova uses when compiling the native build of your app. When your app is submitted to the App Store or Play Store, the Package ID can't be changed. This issue was detected because this app's Package ID is ${chalk.green('"io.ionic.starter"')}, which is the default Package ID provided after running ${chalk.green('ionic start')}.`
    ).trim();
  }

  async detected() {
    const projectConfig = await this.project.load();

    if (!projectConfig.integrations.cordova) {
      return false;
    }

    const conf = await loadConfigXml({ project: this.project });

    return conf.getBundleId() === 'io.ionic.starter';
  }

  async getTreatmentSteps() {
    return [
      { message: `Change the ${chalk.bold('id')} attribute of ${chalk.bold('<widget>')} (root element) to something other than ${chalk.green('"io.ionic.starter"')}` },
    ];
  }
}

class ViewportFitNotSet extends Ailment {
  readonly id = 'viewport-fit-not-set';

  async getMessage() {
    return (
      `${chalk.bold('viewport-fit=cover')} not set in ${chalk.bold('index.html')}\n` +
      `iOS 11 introduces new "safe regions" for webviews, which can throw off component sizing, squish the header into the status bar, letterbox the app on iPhone X, etc. Fixing this issue will ensure the webview takes up the full size of the screen. See ${chalk.bold('https://blog.ionicframework.com/ios-11-checklist')} for more information.`
    ).trim();
  }

  async detected() {
    const indexHtml = await fsReadFile(path.resolve(await this.project.getSourceDir(), 'index.html'), { encoding: 'utf8' });
    const m = indexHtml.match(/\<meta.*viewport-fit=cover/);
    return !Boolean(m);
  }

  async getTreatmentSteps() {
    return [
      { message: `Add ${chalk.bold('viewport-fit=cover')} to the ${chalk.bold('<meta name="viewport">')} tag in your ${chalk.bold('index.html')} file` },
    ];
  }
}

class CordovaPlatformsCommitted extends Ailment {
  readonly id = 'cordova-platforms-committed';

  async getMessage() {
    return (
      `Cordova ${chalk.bold('platforms/')} directory is committed to git.\n` +
      `Cordova considers ${chalk.bold('platforms/')} and ${chalk.bold('plugins/')} build artifacts${chalk.cyan('[1]')}, and routinely overwrites files.\n\n` +
      `While committing these files might be necessary for some projects${chalk.cyan('[2]')}, generally platforms should be configured using ${chalk.bold('config.xml')} and Cordova hooks${chalk.cyan('[3]')} so that your project is more portable and SDK updates are easier.\n\n` +
      `${chalk.cyan('[1]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#version-control')}\n` +
      `${chalk.cyan('[2]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#platforms')}\n` +
      `${chalk.cyan('[3]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/index.html')}\n\n` +
      `${chalk.yellow(`${chalk.bold('WARNING')}: Attempting to fix this could be dangerous. Only proceed if you're sure you haven't made manual modifications to these files.`)}\n`
    ).trim();
  }

  async detected() {
    if (!(await isRepoInitialized(this.project.directory))) {
      return false;
    }

    const cmdInstalled = await this.shell.cmdinfo('git', ['--version']);

    if (!cmdInstalled) {
      return false;
    }

    const files = (await this.shell.output('git', ['ls-tree', '--name-only', 'HEAD'], { fatalOnError: false, showCommand: false, showError: false })).split('\n');

    return files.includes('platforms'); // TODO
  }

  async getTreatmentSteps() {
    return [
      { message: `Remove ${chalk.bold('platforms/')} from source control: ${chalk.green('git rm -rf platforms/')} and ${chalk.green('git commit')}` },
      { message: `Make sure the ${chalk.bold('platforms/')} directory has been removed: ${chalk.green('rm -rf platforms/')}` },
      { message: `Allow Cordova to repopulate your platforms: ${chalk.green('ionic cordova prepare')}` },
    ];
  }
}
