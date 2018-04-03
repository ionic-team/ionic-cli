import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry } from '../../../definitions';
import { Ailment, AilmentDeps, AutomaticallyTreatableAilmentDeps } from '../../doctor/ailments';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';

import { Project as AngularProject } from './';

export function registerAilments(registry: IAilmentRegistry, deps: AutomaticallyTreatableAngularAilmentDeps) {
  // for @ionic/angular
  registry.register(new UpdateAvailable(deps, {
    id: 'ionic-for-angular-update-available',
    pkgName: '@ionic/angular',
    treatmentVisitURL: ['https://github.com/ionic-team/ionic/releases'],
  }));
  registry.register(new MajorUpdateAvailable(deps, {
    id: 'ionic-for-angular-major-update-available',
    pkgName: '@ionic/angular',
    treatmentVisitURL: ['https://blog.ionicframework.com', 'https://github.com/ionic-team/ionic/releases'],
  }));

  // @ionic/schematics-angular
  registry.register(new UpdateAvailable(deps, {
    id: 'ionic-schematics-angular-update-available',
    pkgName: '@ionic/schematics-angular',
    treatmentVisitURL: ['https://github.com/ionic-team/ionic/releases'],
  }));
  registry.register(new MajorUpdateAvailable(deps, {
    id: 'ionic-schematics-angular-major-update-available',
    pkgName: '@ionic/schematics-angular',
    treatmentVisitURL: ['https://blog.ionicframework.com', 'https://github.com/ionic-team/ionic/releases'],
  }));

  // @angular/cli
  registry.register(new UpdateAvailable(deps, {
    id: 'angular-cli-update-available',
    pkgName: '@angular/cli',
    treatmentVisitURL: ['https://github.com/angular/angular-cli/releases'],
  }));
  registry.register(new MajorUpdateAvailable(deps, {
    id: 'angular-cli-major-update-available',
    pkgName: '@angular/cli',
    treatmentVisitURL: ['https://blog.angular.io', 'https://github.com/angular/angular-cli/releases'],
  }));

  // @angular-devkit/core
  registry.register(new UpdateAvailable(deps, {
    id: 'angular-devkit-core-update-available',
    pkgName: '@angular-devkit/core',
    treatmentVisitURL: ['https://github.com/angular/devkit/releases'],
  }));
  registry.register(new MajorUpdateAvailable(deps, {
    id: 'angular-devkit-core-major-update-available',
    pkgName: '@angular-devkit/core',
    treatmentVisitURL: ['https://blog.angular.io', 'https://github.com/angular/devkit/releases'],
  }));

  // @angular-devkit/schematics
  registry.register(new UpdateAvailable(deps, {
    id: 'angular-devkit-schematics-update-available',
    pkgName: '@angular-devkit/schematics',
    treatmentVisitURL: ['https://github.com/angular/devkit/releases'],
  }));
  registry.register(new MajorUpdateAvailable(deps, {
    id: 'angular-devkit-schematics-major-update-available',
    pkgName: '@angular-devkit/schematics',
    treatmentVisitURL: ['https://blog.angular.io', 'https://github.com/angular/devkit/releases'],
  }));
}

interface AngularAilmentDeps extends AilmentDeps {
  project: AngularProject;
}

export interface AutomaticallyTreatableAngularAilmentDeps extends AutomaticallyTreatableAilmentDeps {
  project: AngularProject;
}

export interface AilmentParams {
  id: string;
  pkgName: string;
  treatmentVisitURL: string[];
}

abstract class AngularAilment extends Ailment {
  protected readonly project: AngularProject;
  protected readonly pkgParams: AilmentParams;
  currentVersion?: string;
  latestVersion?: string;

  constructor(deps: AngularAilmentDeps, pkgParams: AilmentParams) {
    super(deps);
    this.pkgParams = pkgParams;
    this.pkgParams.treatmentVisitURL = this.pkgParams.treatmentVisitURL.map(url => chalk.bold(url));
  }

  async getVersionPair(): Promise<[string, string]> {
    const config = await this.config.load();
    const { npmClient } = config;

    if (!this.currentVersion || !this.latestVersion) {
      this.currentVersion = await this.project.getPackageVersion(this.pkgParams.pkgName);
      const pkg = await pkgFromRegistry(npmClient, { pkg: this.pkgParams.pkgName });
      this.latestVersion = pkg ? pkg.version : undefined;
    }

    if (!this.currentVersion || !this.latestVersion) {
      return ['0.0.0', '0.0.0'];
    }

    return [ this.currentVersion, this.latestVersion ];
  }
}

// abstract class AutomaticallyTreatableAngularAilment extends AutomaticallyTreatableAilment {
//   protected readonly project: AngularProject;

//   constructor(deps: AutomaticallyTreatableAngularAilmentDeps) {
//     super(deps);
//   }
// }

class UpdateAvailable extends AngularAilment {
  id = this.pkgParams.id;

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Update available for ${chalk.bold(this.pkgParams.pkgName)}.\n` +
      `An update is available for ${chalk.bold(this.pkgParams.pkgName)} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
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
    const args = await pkgManagerArgs(npmClient, { command: 'install', pkg: this.pkgParams.pkgName + `@${latestVersion ? latestVersion : 'latest'}` });

    return [
      { name: `Visit ${this.pkgParams.treatmentVisitURL.join(' and ')} for each upgrade's instructions` },
      { name: `If no instructions, run: ${chalk.green(args.join(' '))}` },
      { name: `Watch for npm warnings about peer dependencies--they may need manual updating` },
    ];
  }
}

class MajorUpdateAvailable extends AngularAilment {
  id = this.pkgParams.id;
  currentVersion?: string;
  latestVersion?: string;

  async getMessage() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();

    return (
      `Major update available for ${chalk.bold(this.pkgParams.pkgName)}.\n` +
      `A major update is available for ${chalk.bold(this.pkgParams.pkgName)} (${chalk.cyan(currentVersion)} => ${chalk.cyan(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    return [
      { name: `Visit ${this.pkgParams.treatmentVisitURL.join(' and ')} for upgrade instructions` },
    ];
  }
}
