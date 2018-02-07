import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry } from '../../../definitions';
import { Ailment, AilmentDeps, AutomaticallyTreatableAilmentDeps } from '../../doctor/ailments';
import { pkgLatestVersion, pkgManagerArgs } from '../../utils/npm';

import { Project as AngularProject } from './';

export function registerAilments(registry: IAilmentRegistry, deps: AutomaticallyTreatableAngularAilmentDeps) {
  registry.register(new IonicForAngularUpdateAvailable(deps));
  registry.register(new IonicForAngularMajorUpdateAvailable(deps));

  // TODO: @ionic/core update available
  // TODO: Angular CLI update available
}

interface AngularAilmentDeps extends AilmentDeps {
  project: AngularProject;
}

export interface AutomaticallyTreatableAngularAilmentDeps extends AutomaticallyTreatableAilmentDeps {
  project: AngularProject;
}

abstract class AngularAilment extends Ailment {
  protected readonly project: AngularProject;

  constructor(deps: AngularAilmentDeps) {
    super(deps);
  }
}

// abstract class AutomaticallyTreatableAngularAilment extends AutomaticallyTreatableAilment {
//   protected readonly project: AngularProject;

//   constructor(deps: AutomaticallyTreatableAngularAilmentDeps) {
//     super(deps);
//   }
// }

class IonicForAngularUpdateAvailable extends AngularAilment {
  id = 'ionic-for-angular-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getFrameworkVersion();
      this.latestVersion = await pkgLatestVersion('@ionic/angular');
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Update available for ${chalk.bold('@ionic/angular')}.\n` +
      `An update is available for ${chalk.bold('@ionic/angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
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
    const args = await pkgManagerArgs({ npmClient, shell: this.shell }, { command: 'install', pkg: `@ionic/angular@${latestVersion ? latestVersion : 'latest'}` });

    return [
      { name: `Visit ${chalk.bold('https://github.com/ionic-team/ionic/releases')} for each upgrade's instructions` },
      { name: `If no instructions, run: ${chalk.green(args.join(' '))}` },
      { name: `Watch for npm warnings about peer dependencies--they may need manual updating` },
    ];
  }
}

class IonicForAngularMajorUpdateAvailable extends AngularAilment {
  id = 'ionic-for-angular-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getFrameworkVersion();
      this.latestVersion = await pkgLatestVersion('@ionic/angular');
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Major update available for ${chalk.bold('@ionic/angular')}.\n` +
      `A major update is available for ${chalk.bold('@ionic/angular')} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
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
