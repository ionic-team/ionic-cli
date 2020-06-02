import { readFile } from '@ionic/utils-fs';
import * as chalk from 'chalk';
import * as path from 'path';

import { TreatableAilment } from '../../../definitions';
import { AppClient } from '../../app';
import { ancillary, input, strong } from '../../color';
import { getIonicRemote, isRepoInitialized } from '../../git';
import { loadCordovaConfig } from '../../integrations/cordova/config';
import { getPlatforms } from '../../integrations/cordova/project';
import { pkgManagerArgs } from '../../utils/npm';

import { Ailment } from './base';

export * from './base';
export * from './utils';

export class NpmInstalledLocally extends Ailment implements TreatableAilment {
  readonly id = 'npm-installed-locally';
  readonly treatable = true;

  async getMessage() {
    return (
      `${strong('npm')} is installed locally.\n` +
      `${strong('npm')} is typically installed globally and may cause some confusion about versions when other CLIs use it.\n`
    ).trim();
  }

  async detected() {
    const pkg = await this.getLocalPackageJson('npm');
    return pkg !== undefined;
  }

  async getTreatmentSteps() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'uninstall', pkg: 'npm' });

    return [
      {
        message: `Run: ${input(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      },
    ];
  }
}

export class IonicCLIInstalledLocally extends Ailment implements TreatableAilment {
  readonly id = 'ionic-installed-locally';
  readonly treatable = true;

  async getMessage() {
    return (
      `The Ionic CLI is installed locally.\n` +
      `While the CLI can run locally, there's no longer a reason to have it installed locally and it may cause some confusion over configuration and versions.\n`
    ).trim();
  }

  async detected() {
    const pkg = await this.getLocalPackageJson('@ionic/cli');
    return pkg !== undefined;
  }

  async getTreatmentSteps() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'uninstall', pkg: '@ionic/cli' });

    return [
      {
        message: `Run: ${input(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      },
    ];
  }
}

export class GitNotUsed extends Ailment {
  readonly id = 'git-not-used';

  async getMessage() {
    return (
      `Git doesn't appear to be in use.\n` +
      `We highly recommend using source control software such as git (${strong('https://git-scm.com')}) to track changes in your code throughout time.\n`
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
      { message: `Download git if you don't have it installed: ${strong('https://git-scm.com/downloads')}` },
      { message: `Learn the basics if you're unfamiliar with git: ${strong('https://try.github.io')}` },
      { message: `Make your first commit and start tracking code changes! 😍` },
    ];
  }
}

export class GitConfigInvalid extends Ailment {
  readonly id = 'git-config-invalid';

  async getMessage() {
    const appflowId = await this.project.requireAppflowId();

    return (
      `App linked to ${strong(appflowId)} with invalid git configuration.\n` +
      `This app is linked to an app on Ionic (${strong(appflowId)}), but the git configuration is not valid.\n`
    ).trim();
  }

  async detected() {
    const isLoggedIn = this.session.isLoggedIn();

    if (!isLoggedIn) {
      return false;
    }

    const appflowId = this.project.config.get('id');

    if (!appflowId) {
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
    const appClient = new AppClient(token, { client: this.client });
    const app = await appClient.load(appflowId);

    if (app.repo_url !== remote) {
      return true;
    }

    return false;
  }

  async getTreatmentSteps() {
    return [
      { message: `Run: ${input('ionic git remote')}` },
    ];
  }
}

export class IonicNativeOldVersionInstalled extends Ailment {
  readonly id = 'ionic-native-old-version-installed';

  async getMessage() {
    return (
      `Old version of Ionic Native installed.\n` +
      `Ionic Native ${strong('ionic-native')} has been restructured into individual packages under the ${strong('@ionic-native/')} namespace to allow for better bundling and faster apps.\n`
    ).trim();
  }

  async detected() {
    const pkg = await this.getLocalPackageJson('ionic-native');
    return pkg !== undefined;
  }

  async getTreatmentSteps() {
    const args = await pkgManagerArgs(this.config.get('npmClient'), { command: 'uninstall', pkg: 'ionic-native' });

    return [
      { message: `Run ${input(args.join(' '))}` },
      { message: `Refer to ${strong('https://ion.link/native-docs')} for installation & usage instructions` },
    ];
  }
}

export class UnsavedCordovaPlatforms extends Ailment {
  readonly id = 'unsaved-cordova-platforms';

  async getMessage() {
    return (
      `Cordova platforms unsaved.\n` +
      `There are Cordova platforms installed that are not saved in ${strong('config.xml')} or ${strong('package.json')}. It is good practice to manage Cordova platforms and their versions. See the Cordova docs${ancillary('[1]')} for more information.\n\n` +
      `${ancillary('[1]')}: ${strong('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')}\n`
    ).trim();
  }

  async detected() {
    const cordova = this.project.getIntegration('cordova');

    if (!cordova || !cordova.enabled) {
      return false;
    }

    const platforms = await getPlatforms(cordova.root);
    const conf = await loadCordovaConfig(cordova);
    const configuredPlatforms = new Set([...conf.getConfiguredPlatforms().map(e => e.name)]);

    const configXmlDiff = platforms.filter(p => !configuredPlatforms.has(p));

    return configXmlDiff.length > 0;
  }

  async getTreatmentSteps() {
    return [
      { message: `Run: ${input('ionic cordova platform save')}` },
    ];
  }
}

export class DefaultCordovaBundleIdUsed extends Ailment {
  readonly id = 'default-cordova-bundle-id-used';

  async getMessage() {
    return (
      `Package ID unchanged in ${strong('config.xml')}.\n` +
      `The Package Identifier (AKA "Bundle ID" for iOS and "Application ID" for Android) is a unique ID (usually written in reverse DNS notation, such as ${strong('com.mycompany.MyApp')}) that Cordova uses when compiling the native build of your app. When your app is submitted to the App Store or Play Store, the Package ID can't be changed. This issue was detected because this app's Package ID is ${input('"io.ionic.starter"')}, which is the default Package ID provided after running ${input('ionic start')}.`
    ).trim();
  }

  async detected() {
    const cordova = this.project.getIntegration('cordova');

    if (!cordova || !cordova.enabled) {
      return false;
    }

    const conf = await loadCordovaConfig(cordova);

    return conf.getBundleId() === 'io.ionic.starter';
  }

  async getTreatmentSteps() {
    return [
      { message: `Change the ${strong('id')} attribute of ${strong('<widget>')} (root element) to something other than ${input('"io.ionic.starter"')}` },
    ];
  }
}

export class ViewportFitNotSet extends Ailment {
  readonly id: 'viewport-fit-not-set' = 'viewport-fit-not-set';

  async getMessage() {
    return (
      `${strong('viewport-fit=cover')} not set in ${strong('index.html')}\n` +
      `iOS 11 introduces new "safe regions" for webviews, which can throw off component sizing, squish the header into the status bar, letterbox the app on iPhone X, etc. Fixing this issue will ensure the webview takes up the full size of the screen. See ${strong('https://ionicframework.com/blog/ios-11-checklist/')} for more information.`
    ).trim();
  }

  async detected() {
    const indexHtml = await readFile(path.resolve(await this.project.getSourceDir(), 'index.html'), { encoding: 'utf8' });
    const m = indexHtml.match(/\<meta([\s]*(name=['"]viewport['"]){1})[\w\d\s\.\-,=]*(content=['"]){1}[\w\d\s\.\-,=]*(viewport-fit=cover){1}[\w\d\s\.\-,='"]+\/?\>/);
    return !Boolean(m);
  }

  async getTreatmentSteps() {
    return [
      { message: `Add ${strong('viewport-fit=cover')} to the ${strong('<meta name="viewport">')} tag in your ${strong('index.html')} file` },
    ];
  }
}

export class CordovaPlatformsCommitted extends Ailment {
  readonly id = 'cordova-platforms-committed';

  async getMessage() {
    return (
      `Cordova ${strong('platforms/')} directory is committed to git.\n` +
      `Cordova considers ${strong('platforms/')} and ${strong('plugins/')} build artifacts${ancillary('[1]')}, and routinely overwrites files.\n\n` +
      `While committing these files might be necessary for some projects${ancillary('[2]')}, generally platforms should be configured using ${strong('config.xml')} and Cordova hooks${ancillary('[3]')} so that your project is more portable and SDK updates are easier.\n\n` +
      `${ancillary('[1]')}: ${strong('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#version-control')}\n` +
      `${ancillary('[2]')}: ${strong('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#platforms')}\n` +
      `${ancillary('[3]')}: ${strong('https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/index.html')}\n\n` +
      `${chalk.yellow(`${strong('WARNING')}: Attempting to fix this could be dangerous. Only proceed if you're sure you haven't made manual modifications to these files.`)}\n`
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
      { message: `Remove ${strong('platforms/')} from source control: ${input('git rm -rf platforms/')} and ${input('git commit')}` },
      { message: `Make sure the ${strong('platforms/')} directory has been removed: ${input('rm -rf platforms/')}` },
      { message: `Allow Cordova to repopulate your platforms: ${input('ionic cordova prepare')}` },
    ];
  }
}
