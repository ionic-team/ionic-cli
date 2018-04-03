import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry } from '../../../definitions';
import { Ailment, AilmentDeps, AutomaticallyTreatableAilment, AutomaticallyTreatableAilmentDeps } from '../../doctor/ailments';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';
import { BUILD_SCRIPT } from '../../build';
import { SERVE_SCRIPT } from '../../serve';
import { DEFAULT_BUILD_SCRIPT_VALUE } from './build';
import { DEFAULT_SERVE_SCRIPT_VALUE } from './serve';

import { Project as IonicAngularProject } from './';

export function registerAilments(registry: IAilmentRegistry, deps: AutomaticallyTreatableIonicAngularAilmentDeps) {
  registry.register(new IonicAngularUpdateAvailable(deps));
  registry.register(new IonicAngularMajorUpdateAvailable(deps));
  registry.register(new AppScriptsUpdateAvailable(deps));
  registry.register(new AppScriptsMajorUpdateAvailable(deps));
  registry.register(new IonicAngularPackageJsonHasDefaultIonicBuildCommand(deps));
  registry.register(new IonicAngularPackageJsonHasDefaultIonicServeCommand(deps));
}

interface IonicAngularAilmentDeps extends AilmentDeps {
  project: IonicAngularProject;
}

export interface AutomaticallyTreatableIonicAngularAilmentDeps extends AutomaticallyTreatableAilmentDeps {
  project: IonicAngularProject;
}

abstract class IonicAngularAilment extends Ailment {
  protected readonly project: IonicAngularProject;

  constructor(deps: IonicAngularAilmentDeps) {
    super(deps);
    this.project = deps.project;
  }
}

abstract class AutomaticallyTreatableIonicAngularAilment extends AutomaticallyTreatableAilment {
  protected readonly project: IonicAngularProject;

  constructor(deps: AutomaticallyTreatableIonicAngularAilmentDeps) {
    super(deps);
    this.project = deps.project;
  }
}

class IonicAngularUpdateAvailable extends IonicAngularAilment {
  id = 'ionic-angular-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getPackageVersion('ionic-angular');
      const pkg = await pkgFromRegistry(npmClient, { pkg: 'ionic-angular' });
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
      { name: `Visit ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for each upgrade's instructions` },
      { name: `If no instructions, run: ${chalk.green(args.join(' '))}` },
      { name: `Watch for npm warnings about peer dependencies--they may need manual updating` },
    ];
  }
}

class IonicAngularMajorUpdateAvailable extends IonicAngularAilment {
  id = 'ionic-angular-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getPackageVersion('ionic-angular');
      const pkg = await pkgFromRegistry(npmClient, { pkg: 'ionic-angular' });
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
      { name: `Visit ${chalk.bold('https://blog.ionicframework.com')} and ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for upgrade instructions` },
    ];
  }
}

class AppScriptsUpdateAvailable extends AutomaticallyTreatableIonicAngularAilment {
  id = 'app-scripts-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getPackageVersion('@ionic/app-scripts');
      const pkg = await pkgFromRegistry(npmClient, { pkg: '@ionic/app-scripts' });
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
        name: `Run: ${chalk.green(manager + ' ' + managerArgs.join(' '))}`,
        treat: async () => {
          await this.shell.run(manager, managerArgs, {});
        },
      },
    ];
  }
}

class AppScriptsMajorUpdateAvailable extends IonicAngularAilment {
  id = 'app-scripts-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getPackageVersion('@ionic/app-scripts');
      const pkg = await pkgFromRegistry(npmClient, { pkg: '@ionic/app-scripts' });
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
      { name: `Visit ${chalk.bold('https://github.com/ionic-team/ionic-app-scripts/releases')} for upgrade instructions` },
    ];
  }
}

class IonicAngularPackageJsonHasDefaultIonicBuildCommand extends IonicAngularAilment {
  id = 'ionic-angular-package-json-has-default-ionic-build-command';
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
      { name: `Remove the ${chalk.bold(BUILD_SCRIPT)} npm script from ${chalk.bold('package.json')}` },
      { name: `Continue using ${chalk.green('ionic build')} normally` },
    ];
  }
}

class IonicAngularPackageJsonHasDefaultIonicServeCommand extends IonicAngularAilment {
  id = 'ionic-angular-package-json-has-default-ionic-serve-command';
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
      { name: `Remove the ${chalk.bold(SERVE_SCRIPT)} npm script from ${chalk.bold('package.json')}` },
      { name: `Continue using ${chalk.green('ionic serve')} normally` },
    ];
  }
}
