import chalk from 'chalk';
import * as semver from 'semver';

import { IAilmentRegistry } from '../../../definitions';
import { Ailment, AilmentDeps, AutomaticallyTreatableAilmentDeps } from '../../doctor/ailments';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';

import { Project as AngularProject } from './';

export function registerAilments(registry: IAilmentRegistry, deps: AutomaticallyTreatableAngularAilmentDeps) {
  // TODO: @ionic/core update available
  // TODO: Angular CLI update available
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

    let boldTreatmentVisitURL: string[] = [];
    this.pkgParams.treatmentVisitURL.forEach((url: string) => {
      boldTreatmentVisitURL = boldTreatmentVisitURL.concat(chalk.bold(url));
    });
    this.pkgParams.treatmentVisitURL = boldTreatmentVisitURL;
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
