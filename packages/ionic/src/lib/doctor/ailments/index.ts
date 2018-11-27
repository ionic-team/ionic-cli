import * as path from 'path';

import chalk from 'chalk';

import { readFile } from '@ionic/utils-fs';

import { TreatableAilment } from '../../../definitions';
import { AppClient } from '../../app';
import { getIonicRemote, isRepoInitialized } from '../../git';
import { loadConfigXml } from '../../integrations/cordova/config';
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
      `${chalk.bold('npm')} is installed locally.\n` +
      `${chalk.bold('npm')} is typically installed globally and may cause some confusion about versions when other CLIs use it.\n`
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
        message: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
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
    const pkg = await this.getLocalPackageJson('ionic');
    return pkg !== undefined;
  }

  async getTreatmentSteps() {
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'uninstall', pkg: 'ionic' });

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

export class GitNotUsed extends Ailment {
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

export class GitConfigInvalid extends Ailment {
  readonly id = 'git-config-invalid';

  async getMessage() {
    const appflowId = await this.project.requireAppflowId();

    return (
      `App linked to ${chalk.bold(appflowId)} with invalid git configuration.\n` +
      `This app is linked to an app on Ionic (${chalk.bold(appflowId)}), but the git configuration is not valid.\n`
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

    const token = this.session.getUserToken();
    const appClient = new AppClient(token, { client: this.client });
    const app = await appClient.load(appflowId);

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

export class IonicNativeOldVersionInstalled extends Ailment {
  readonly id = 'ionic-native-old-version-installed';

  async getMessage() {
    return (
      `Old version of Ionic Native installed.\n` +
      `Ionic Native ${chalk.bold('ionic-native')} has been restructured into individual packages under the ${chalk.bold('@ionic-native/')} namespace to allow for better bundling and faster apps.\n`
    ).trim();
  }

  async detected() {
    const pkg = await this.getLocalPackageJson('ionic-native');
    return pkg !== undefined;
  }

  async getTreatmentSteps() {
    const args = await pkgManagerArgs(this.config.get('npmClient'), { command: 'uninstall', pkg: 'ionic-native' });

    return [
      { message: `Run ${chalk.green(args.join(' '))}` },
      { message: `Refer to ${chalk.bold('https://ionicframework.com/docs/native')} for installation & usage instructions` },
    ];
  }
}

export class UnsavedCordovaPlatforms extends Ailment {
  readonly id = 'unsaved-cordova-platforms';

  async getMessage() {
    return (
      `Cordova platforms unsaved.\n` +
      `There are Cordova platforms installed that are not saved in ${chalk.bold('config.xml')} or ${chalk.bold('package.json')}. It is good practice to manage Cordova platforms and their versions. See the Cordova docs${chalk.cyan('[1]')} for more information.\n\n` +
      `${chalk.cyan('[1]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')}\n`
    ).trim();
  }

  async detected() {
    const cordova = this.project.getIntegration('cordova');

    if (!cordova || !cordova.enabled) {
      return false;
    }

    const platforms = await getPlatforms(cordova.root);
    const conf = await loadConfigXml(cordova);
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

export class DefaultCordovaBundleIdUsed extends Ailment {
  readonly id = 'default-cordova-bundle-id-used';

  async getMessage() {
    return (
      `Package ID unchanged in ${chalk.bold('config.xml')}.\n` +
      `The Package Identifier (AKA "Bundle ID" for iOS and "Application ID" for Android) is a unique ID (usually written in reverse DNS notation, such as ${chalk.bold('com.mycompany.MyApp')}) that Cordova uses when compiling the native build of your app. When your app is submitted to the App Store or Play Store, the Package ID can't be changed. This issue was detected because this app's Package ID is ${chalk.green('"io.ionic.starter"')}, which is the default Package ID provided after running ${chalk.green('ionic start')}.`
    ).trim();
  }

  async detected() {
    const cordova = this.project.getIntegration('cordova');

    if (!cordova || !cordova.enabled) {
      return false;
    }

    const conf = await loadConfigXml(cordova);

    return conf.getBundleId() === 'io.ionic.starter';
  }

  async getTreatmentSteps() {
    return [
      { message: `Change the ${chalk.bold('id')} attribute of ${chalk.bold('<widget>')} (root element) to something other than ${chalk.green('"io.ionic.starter"')}` },
    ];
  }
}

export class ViewportFitNotSet extends Ailment {
  readonly id: 'viewport-fit-not-set' = 'viewport-fit-not-set';

  async getMessage() {
    return (
      `${chalk.bold('viewport-fit=cover')} not set in ${chalk.bold('index.html')}\n` +
      `iOS 11 introduces new "safe regions" for webviews, which can throw off component sizing, squish the header into the status bar, letterbox the app on iPhone X, etc. Fixing this issue will ensure the webview takes up the full size of the screen. See ${chalk.bold('https://blog.ionicframework.com/ios-11-checklist')} for more information.`
    ).trim();
  }

  async detected() {
    const indexHtml = await readFile(path.resolve(await this.project.getSourceDir(), 'index.html'), { encoding: 'utf8' });
    const m = indexHtml.match(/\<meta.*viewport-fit=cover/);
    return !Boolean(m);
  }

  async getTreatmentSteps() {
    return [
      { message: `Add ${chalk.bold('viewport-fit=cover')} to the ${chalk.bold('<meta name="viewport">')} tag in your ${chalk.bold('index.html')} file` },
    ];
  }
}

export class CordovaPlatformsCommitted extends Ailment {
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
