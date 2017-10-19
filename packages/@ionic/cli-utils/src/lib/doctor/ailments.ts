import * as path from 'path';

import chalk from 'chalk';
import * as semver from 'semver';

import { IonicEnvironment } from '../../definitions';
import { isCordovaPackageJson } from '../../guards';
import { App } from '../app';
import { BACKEND_PRO } from '../backends';
import { getIonicRemote, isRepoInitialized } from '../git';
import { pathExists } from '../utils/fs';
import { pkgLatestVersion, pkgManagerArgs } from '../utils/npm';
import { getAppScriptsVersion, getIonicAngularVersion } from '../ionic-angular/utils';
import { getPlatforms } from '../cordova/project';
import { ConfigXml } from '../cordova/config';

export interface TreatmentStep {
  name: string;
}

export interface AutomaticTreatmentStep extends TreatmentStep {
  treat(): Promise<void>;
}

export abstract class Ailment {
  requiresAuthentication = false;
  abstract id: string;
  abstract async getMessage(env: IonicEnvironment): Promise<string>;
  abstract async getTreatmentSteps(env: IonicEnvironment): Promise<TreatmentStep[]>;
  abstract async detected(env: IonicEnvironment): Promise<boolean>;
}

export abstract class AutomaticallyTreatableAilment extends Ailment {
  abstract async getTreatmentSteps(env: IonicEnvironment): Promise<AutomaticTreatmentStep[]>;
}

export namespace Ailments {
  export class AutomaticUpdatesOff extends AutomaticallyTreatableAilment {
    id = 'automatic-updates-off';

    async getMessage() {
      return (
        `Automatic Ionic CLI updates are off.\n` +
        `The Ionic CLI can check for updates in the background and prompt you to install updates automatically.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const config = await env.config.load();
      return !config.daemon.updates;
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      return [
        {
          name: 'Turn on automatic updates',
          treat: async () => {
            const config = await env.config.load();
            config.daemon.updates = true;
          },
        },
      ];
    }
  }

  export class NpmInstalledLocally extends AutomaticallyTreatableAilment {
    id = 'npm-installed-locally';

    async getMessage() {
      return (
        `${chalk.bold('npm')} is installed locally.\n` +
        `${chalk.bold('npm')} is typically installed globally and may cause some confusion about versions when other CLIs use it.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      return pathExists(path.join(env.project.directory, 'node_modules', 'npm'));
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const [ manager, ...managerArgs ] = await pkgManagerArgs(env, { command: 'uninstall', pkg: 'npm' });

      return [
        {
          name: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
          treat: async () => {
            await env.shell.run(manager, managerArgs, {});
          },
        },
      ];
    }
  }

  export class IonicCLIInstalledLocally extends AutomaticallyTreatableAilment {
    id = 'ionic-installed-locally';

    async getMessage() {
      return (
        `The Ionic CLI is installed locally.\n` +
        `While the CLI can run locally, there's no longer a reason to have it installed locally and it may cause some confusion over configuration and versions.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      return pathExists(path.join(env.project.directory, 'node_modules', 'ionic'));
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const [ manager, ...managerArgs ] = await pkgManagerArgs(env, { command: 'uninstall', pkg: 'ionic' });

      return [
        {
          name: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
          treat: async () => {
            await env.shell.run(manager, managerArgs, {});
          },
        },
      ];
    }
  }

  export class GitNotUsed extends Ailment {
    id = 'git-not-used';

    async getMessage() {
      return (
        `Git doesn't appear to be in use.\n` +
        `We highly recommend using source control software such as git (${chalk.bold('https://git-scm.com')}) to track changes in your code throughout time.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      if (!(await isRepoInitialized(env))) {
        return true;
      }

      const cmdInstalled = await env.shell.cmdinfo('git', ['--version']);

      if (!cmdInstalled) {
        return true;
      }

      const commitCount = Number(await env.shell.run('git', ['rev-list', '--count', 'HEAD'], { showCommand: false }));

      return commitCount <= 1;
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      return [
        {
          name: `Download git if you don't have it installed: ${chalk.bold('https://git-scm.com/downloads')}`,
        },
        {
          name: `Learn the basics: ${chalk.bold('https://try.github.io')}`,
        },
        {
          name: `Make your first commit and start tracking code changes! 😍`,
        },
      ];
    }
  }

  export class GitConfigInvalid extends AutomaticallyTreatableAilment {
    id = 'git-config-invalid';
    requiresAuthentication = true;

    async getMessage(env: IonicEnvironment) {
      const project = await env.project.load();
      const appId = project.app_id;

      return (
        `App linked to ${chalk.bold(appId)} with invalid git configuration.\n` +
        `This app is linked to an app on Ionic (${chalk.bold(appId)}), but the git configuration is not valid.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const config = await env.config.load();
      const project = await env.project.load();
      const appId = project.app_id;

      if (config.backend !== BACKEND_PRO) {
        return false;
      }

      if (!appId) {
        return false;
      }

      if (!(await isRepoInitialized(env))) {
        return false;
      }

      const remote = await getIonicRemote(env);

      if (!remote) {
        return true;
      }

      const token = await env.session.getUserToken();
      const appLoader = new App(token, env.client);
      const app = await appLoader.load(appId);

      if (app.repo_url !== remote) {
        return true;
      }

      return false;
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const args = ['git', 'remote'];

      return [
        {
          name: `Run: ${chalk.green('ionic ' + args.join(' '))}`,
          treat: async () => {
            await env.runCommand(args);
          },
        },
      ];
    }
  }

  export class IonicAngularUpdateAvailable extends Ailment {
    id = 'ionic-angular-update-available';
    currentVersion?: string;
    latestVersion?: string;

    async getVersionPair(env: IonicEnvironment): Promise<[string, string]> {
      if (!this.currentVersion || !this.latestVersion) {
        this.currentVersion = await getIonicAngularVersion(env, env.project);
        this.latestVersion = await pkgLatestVersion(env, 'ionic-angular');
      }

      if (!this.currentVersion || !this.latestVersion) {
        return ['0.0.0', '0.0.0'];
      }

      return [ this.currentVersion, this.latestVersion ];
    }

    async getMessage(env: IonicEnvironment) {
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      return (
        `Update available for Ionic Framework.\n` +
        `An update is available for ${chalk.bold('ionic-angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const project = await env.project.load();
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      if (project.type !== 'ionic-angular') {
        return false;
      }

      const diff = semver.diff(currentVersion, latestVersion);

      return diff === 'minor' || diff === 'patch';
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const [ , latestVersion ] = await this.getVersionPair(env);
      const args = await pkgManagerArgs(env, { pkg: `ionic-angular@${latestVersion ? latestVersion : 'latest'}` });

      return [
        {
          name: `Visit ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for each upgrade's instructions`,
        },
        {
          name: `If no instructions, run: ${chalk.green(args.join(' '))}`,
        },
        {
          name: `Watch for npm warnings about peer dependencies--they may need manual updating`,
        },
      ];
    }
  }

  export class IonicAngularMajorUpdateAvailable extends Ailment {
    id = 'ionic-angular-major-update-available';
    currentVersion?: string;
    latestVersion?: string;

    async getVersionPair(env: IonicEnvironment): Promise<[string, string]> {
      if (!this.currentVersion || !this.latestVersion) {
        this.currentVersion = await getIonicAngularVersion(env, env.project);
        this.latestVersion = await pkgLatestVersion(env, 'ionic-angular');
      }

      if (!this.currentVersion || !this.latestVersion) {
        return ['0.0.0', '0.0.0'];
      }

      return [ this.currentVersion, this.latestVersion ];
    }

    async getMessage(env: IonicEnvironment) {
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      return (
        `Major update available for Ionic Framework.\n` +
        `A major update is available for ${chalk.bold('ionic-angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const project = await env.project.load();
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      if (project.type !== 'ionic-angular') {
        return false;
      }

      const diff = semver.diff(currentVersion, latestVersion);

      return diff === 'major';
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      return [
        {
          name: `Visit ${chalk.bold('http://blog.ionic.io')} and ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for upgrade instructions`,
        },
      ];
    }
  }

  export class AppScriptsUpdateAvailable extends AutomaticallyTreatableAilment {
    id = 'app-scripts-update-available';
    currentVersion?: string;
    latestVersion?: string;

    async getVersionPair(env: IonicEnvironment): Promise<[string, string]> {
      if (!this.currentVersion || !this.latestVersion) {
        this.currentVersion = await getAppScriptsVersion(env, env.project);
        this.latestVersion = await pkgLatestVersion(env, '@ionic/app-scripts');
      }

      if (!this.currentVersion || !this.latestVersion) {
        return ['0.0.0', '0.0.0'];
      }

      return [ this.currentVersion, this.latestVersion ];
    }

    async getMessage(env: IonicEnvironment) {
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      return (
        `Update available for ${chalk.bold('@ionic/app-scripts')}.\n` +
        `An update is available for ${chalk.bold('@ionic/app-scripts')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const project = await env.project.load();
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      if (project.type !== 'ionic-angular') {
        return false;
      }

      const diff = semver.diff(currentVersion, latestVersion);

      return diff === 'minor' || diff === 'patch';
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const [ , latestVersion ] = await this.getVersionPair(env);
      const [ manager, ...managerArgs ] = await pkgManagerArgs(env, { pkg: `@ionic/app-scripts@${latestVersion ? latestVersion : 'latest'}`, saveDev: true });

      return [
        {
          name: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
          treat: async () => {
            await env.shell.run(manager, managerArgs, {});
          },
        },
      ];
    }
  }

  export class AppScriptsMajorUpdateAvailable extends Ailment {
    id = 'app-scripts-major-update-available';
    currentVersion?: string;
    latestVersion?: string;

    async getVersionPair(env: IonicEnvironment): Promise<[string, string]> {
      if (!this.currentVersion || !this.latestVersion) {
        this.currentVersion = await getAppScriptsVersion(env, env.project);
        this.latestVersion = await pkgLatestVersion(env, '@ionic/app-scripts');
      }

      if (!this.currentVersion || !this.latestVersion) {
        return ['0.0.0', '0.0.0'];
      }

      return [ this.currentVersion, this.latestVersion ];
    }

    async getMessage(env: IonicEnvironment) {
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      return (
        `Major update available for ${chalk.bold('@ionic/app-scripts')}.\n` +
        `A major update is available for ${chalk.bold('@ionic/app-scripts')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const project = await env.project.load();
      const [ currentVersion, latestVersion ] = await this.getVersionPair(env);

      if (project.type !== 'ionic-angular') {
        return false;
      }

      const diff = semver.diff(currentVersion, latestVersion);

      return diff === 'major';
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      return [
        {
          name: `Visit ${chalk.bold('https://github.com/ionic-team/ionic-app-scripts/releases')} for upgrade instructions`,
        },
      ];
    }
  }

  export class UnsavedCordovaPlatforms extends AutomaticallyTreatableAilment {
    id = 'unsaved-cordova-platforms';

    async getMessage(env: IonicEnvironment) {
      return (
        `Cordova platforms unsaved.\n` +
        `There are Cordova platforms installed that are not saved in ${chalk.bold('config.xml')} or ${chalk.bold('package.json')}. It is good practice to manage Cordova platforms and their versions. See ${chalk.bold('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')} for more information.\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      const project = await env.project.load();
      const packageJson = await env.project.loadPackageJson();

      if (!project.integrations.cordova) {
        return false;
      }

      if (!isCordovaPackageJson(packageJson)) {
        return false;
      }

      const platforms = await getPlatforms(env.project.directory);
      const conf = await ConfigXml.load(env.project.directory);
      const engines = conf.getPlatformEngines();
      const engineNames = new Set([...engines.map(e => e.name)]);
      const packageJsonPlatforms = new Set([...packageJson.cordova.platforms]);

      const configXmlDiff = platforms.filter(p => !engineNames.has(p));
      const packageJsonDiff = platforms.filter(p => !packageJsonPlatforms.has(p));

      return configXmlDiff.length > 0 || packageJsonDiff.length > 0;
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      const args = ['cordova', 'platform', 'save'];

      return [
        {
          name: `Run: ${chalk.green('ionic ' + args.join(' '))}`,
          treat: async () => {
            await env.runCommand(args);
          },
        },
      ];
    }
  }

  export class CordovaPlatformsCommitted extends Ailment {
    id = 'cordova-platforms-committed';

    async getMessage() {
      return (
        `Cordova ${chalk.bold('platforms/')} directory is committed to git.\n` +
        `Cordova considers ${chalk.bold('platforms/')} and ${chalk.bold('plugins/')} build artifacts${chalk.cyan('[1]')}, and routinely overwrites files.\n\n` +
        `While committing these files might be necessary for some projects${chalk.cyan('[2]')}, generally platforms should be configured using ${chalk.bold('config.xml')} and Cordova hooks${chalk.cyan('[3]')} so that your project is more portable and SDK updates are easier.\n\n` +
        `${chalk.cyan('[1]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#version-control')}\n` +
        `${chalk.cyan('[2]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/#platforms')}\n` +
        `${chalk.cyan('[3]')}: ${chalk.bold('https://cordova.apache.org/docs/en/latest/guide/appdev/hooks/index.html')}\n` +
        `\n`
      ).trim();
    }

    async detected(env: IonicEnvironment) {
      if (!(await isRepoInitialized(env))) {
        return false;
      }

      const cmdInstalled = await env.shell.cmdinfo('git', ['--version']);

      if (!cmdInstalled) {
        return false;
      }

      const files = (await env.shell.run('git', ['ls-tree', '--name-only', 'HEAD'], { showCommand: false })).split('\n');

      return files.includes('platforms'); // TODO
    }

    async getTreatmentSteps(env: IonicEnvironment) {
      return [];
    }
  }

  export const ALL = [
    AutomaticUpdatesOff,
    NpmInstalledLocally,
    IonicCLIInstalledLocally,
    GitNotUsed,
    GitConfigInvalid,
    IonicAngularUpdateAvailable,
    IonicAngularMajorUpdateAvailable,
    AppScriptsUpdateAvailable,
    AppScriptsMajorUpdateAvailable,
    UnsavedCordovaPlatforms,
    CordovaPlatformsCommitted,
  ];
}
