import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry } from '../../../definitions';
import { Ailment, AilmentDeps, AutomaticallyTreatableAilment, AutomaticallyTreatableAilmentDeps } from '../../doctor/ailments';
import { pkgLatestVersion, pkgManagerArgs } from '../../utils/npm';

import { Project as IonicAngularProject } from './';

export function registerAilments(registry: IAilmentRegistry, deps: AutomaticallyTreatableIonicAngularAilmentDeps) {
  registry.register(new IonicAngularUpdateAvailable(deps));
  registry.register(new IonicAngularMajorUpdateAvailable(deps));
  registry.register(new AppScriptsUpdateAvailable(deps));
  registry.register(new AppScriptsMajorUpdateAvailable(deps));
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
  }
}

abstract class AutomaticallyTreatableIonicAngularAilment extends AutomaticallyTreatableAilment {
  protected readonly project: IonicAngularProject;

  constructor(deps: AutomaticallyTreatableIonicAngularAilmentDeps) {
    super(deps);
  }
}

class IonicAngularUpdateAvailable extends IonicAngularAilment {
  id = 'ionic-angular-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getFrameworkVersion();
      this.latestVersion = await pkgLatestVersion('ionic-angular');
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
    const args = await pkgManagerArgs({ npmClient, shell: this.shell }, { command: 'install', pkg: `ionic-angular@${latestVersion ? latestVersion : 'latest'}` });

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
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getFrameworkVersion();
      this.latestVersion = await pkgLatestVersion('ionic-angular');
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
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getAppScriptsVersion();
      this.latestVersion = await pkgLatestVersion('@ionic/app-scripts');
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
    const [ manager, ...managerArgs ] = await pkgManagerArgs({ npmClient, shell: this.shell }, { command: 'install', pkg: `@ionic/app-scripts@${latestVersion ? latestVersion : 'latest'}`, saveDev: true });

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
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getAppScriptsVersion();
      this.latestVersion = await pkgLatestVersion('@ionic/app-scripts');
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
