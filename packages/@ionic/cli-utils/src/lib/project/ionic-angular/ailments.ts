import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry, ProjectType, TreatableAilment } from '../../../definitions';
import { BUILD_SCRIPT } from '../../build';
import { Ailment, AilmentDeps } from '../../doctor/ailments';
import { SERVE_SCRIPT } from '../../serve';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';

import { IonicAngularProject } from './';
import { DEFAULT_BUILD_SCRIPT_VALUE } from './build';
import { DEFAULT_SERVE_SCRIPT_VALUE } from './serve';

export async function registerAilments(registry: IAilmentRegistry, deps: IonicAngularAilmentDeps): Promise<void> {
  registry.register(new IonicAngularUpdateAvailable(deps));
  registry.register(new IonicAngularMajorUpdateAvailable(deps));
  registry.register(new AppScriptsUpdateAvailable(deps));
  registry.register(new AppScriptsMajorUpdateAvailable(deps));
  registry.register(new IonicAngularPackageJsonHasDefaultIonicBuildCommand(deps));
  registry.register(new IonicAngularPackageJsonHasDefaultIonicServeCommand(deps));
}

export interface IonicAngularAilmentDeps extends AilmentDeps {
  readonly project: IonicAngularProject;
}

abstract class IonicAngularAilment extends Ailment {
  readonly projects: ProjectType[] = ['ionic-angular'];
  protected readonly project: IonicAngularProject;

  constructor(deps: IonicAngularAilmentDeps) {
    super(deps);
    this.project = deps.project;
  }
}

class IonicAngularUpdateAvailable extends IonicAngularAilment {
  readonly id = 'ionic-angular-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('ionic-angular');
      const latestPkg = await pkgFromRegistry(npmClient, { pkg: 'ionic-angular' });
      this.currentVersion = currentPkg ? currentPkg.version : undefined;
      this.latestVersion = latestPkg ? latestPkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Update available for Ionic Framework.\n` +
      `An update is available for ${chalk.bold('ionic-angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
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
    const args = await pkgManagerArgs(npmClient, { command: 'install', pkg: `ionic-angular@${latestVersion ? latestVersion : 'latest'}` });

    return [
      { message: `Visit ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for each upgrade's instructions` },
      { message: `If no instructions, run: ${chalk.green(args.join(' '))}` },
      { message: `Watch for npm warnings about peer dependencies--they may need manual updating` },
    ];
  }
}

class IonicAngularMajorUpdateAvailable extends IonicAngularAilment {
  readonly id = 'ionic-angular-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('ionic-angular');
      const latestPkg = await pkgFromRegistry(npmClient, { pkg: 'ionic-angular' });
      this.currentVersion = currentPkg ? currentPkg.version : undefined;
      this.latestVersion = latestPkg ? latestPkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Major update available for Ionic Framework.\n` +
      `A major update is available for ${chalk.bold('ionic-angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    return [
      { message: `Visit ${chalk.bold('https://blog.ionicframework.com')} and ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for upgrade instructions` },
    ];
  }
}

class AppScriptsUpdateAvailable extends IonicAngularAilment implements TreatableAilment {
  readonly id = 'app-scripts-update-available';
  readonly treatable = true;
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('@ionic/app-scripts');
      const latestPkg = await pkgFromRegistry(npmClient, { pkg: '@ionic/app-scripts' });
      this.currentVersion = currentPkg ? currentPkg.version : undefined;
      this.latestVersion = latestPkg ? latestPkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Update available for ${chalk.bold('@ionic/app-scripts')}.\n` +
      `An update is available for ${chalk.bold('@ionic/app-scripts')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
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
    const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { command: 'install', pkg: `@ionic/app-scripts@${latestVersion ? latestVersion : 'latest'}`, saveDev: true });

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

class AppScriptsMajorUpdateAvailable extends IonicAngularAilment {
  readonly id = 'app-scripts-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('@ionic/app-scripts');
      const latestPkg = await pkgFromRegistry(npmClient, { pkg: '@ionic/app-scripts' });
      this.currentVersion = currentPkg ? currentPkg.version : undefined;
      this.latestVersion = latestPkg ? latestPkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Major update available for ${chalk.bold('@ionic/app-scripts')}.\n` +
      `A major update is available for ${chalk.bold('@ionic/app-scripts')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    return [
      { message: `Visit ${chalk.bold('https://github.com/ionic-team/ionic-app-scripts/releases')} for upgrade instructions` },
    ];
  }
}

class IonicAngularPackageJsonHasDefaultIonicBuildCommand extends IonicAngularAilment {
  readonly id = 'ionic-angular-package-json-has-default-ionic-build-command';
  currentVersion?: string;
  latestVersion?: string;

  async getMessage() {
    return (
      `The ${chalk.bold(BUILD_SCRIPT)} npm script is unchanged.\n` +
      `The Ionic CLI as of version 4.0 looks for the ${chalk.bold(BUILD_SCRIPT)} npm script in ${chalk.bold('package.json')} for a custom build script to run instead of the default (${chalk.green(DEFAULT_BUILD_SCRIPT_VALUE)}). If you don't use it, it's considered quicker and cleaner to just remove it.`
    ).trim();
  }

  async detected() {
    const pkg = await this.project.requirePackageJson();

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT] === DEFAULT_BUILD_SCRIPT_VALUE) {
      return true;
    }

    return false;
  }

  async getTreatmentSteps() {
    return [
      { message: `Remove the ${chalk.bold(BUILD_SCRIPT)} npm script from ${chalk.bold('package.json')}` },
      { message: `Continue using ${chalk.green('ionic build')} normally` },
    ];
  }
}

class IonicAngularPackageJsonHasDefaultIonicServeCommand extends IonicAngularAilment {
  readonly id = 'ionic-angular-package-json-has-default-ionic-serve-command';
  currentVersion?: string;
  latestVersion?: string;

  async getMessage() {
    return (
      `The ${chalk.bold(SERVE_SCRIPT)} npm script is unchanged.\n` +
      `The Ionic CLI as of version 4.0 looks for the ${chalk.bold(SERVE_SCRIPT)} npm script in ${chalk.bold('package.json')} for a custom serve script to run instead of the default (${chalk.green(DEFAULT_SERVE_SCRIPT_VALUE)}). If you don't use it, it's considered quicker and cleaner to just remove it.`
    ).trim();
  }

  async detected() {
    const pkg = await this.project.requirePackageJson();

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT] === DEFAULT_SERVE_SCRIPT_VALUE) {
      return true;
    }

    return false;
  }

  async getTreatmentSteps() {
    return [
      { message: `Remove the ${chalk.bold(SERVE_SCRIPT)} npm script from ${chalk.bold('package.json')}` },
      { message: `Continue using ${chalk.green('ionic serve')} normally` },
    ];
  }
}
