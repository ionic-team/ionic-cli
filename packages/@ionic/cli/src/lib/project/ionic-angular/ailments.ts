import * as semver from 'semver';

import { ProjectType, TreatableAilment } from '../../../definitions';
import { BUILD_SCRIPT } from '../../build';
import { ancillary, input, strong } from '../../color';
import { Ailment, AilmentDeps } from '../../doctor';
import { SERVE_SCRIPT } from '../../serve';
import { pkgFromRegistry, pkgManagerArgs } from '../../utils/npm';

import { IonicAngularProject } from './';
import { DEFAULT_BUILD_SCRIPT_VALUE } from './build';
import { DEFAULT_SERVE_SCRIPT_VALUE } from './serve';

export interface IonicAngularAilmentDeps extends AilmentDeps {
  readonly project: IonicAngularProject;
}

export abstract class IonicAngularAilment extends Ailment {
  readonly projects: ProjectType[] = ['ionic-angular'];
  protected readonly project: IonicAngularProject;

  constructor(deps: IonicAngularAilmentDeps) {
    super(deps);
    this.project = deps.project;
  }
}

export class IonicAngularUpdateAvailable extends IonicAngularAilment {
  readonly id = 'ionic-angular-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('ionic-angular');
      const latestPkg = await pkgFromRegistry(this.config.get('npmClient'), { pkg: 'ionic-angular' });
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
      `An update is available for ${strong('ionic-angular')} (${ancillary(currentVersion)} => ${ancillary(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'minor' || diff === 'patch';
  }

  async getTreatmentSteps() {
    const [ , latestVersion ] = await this.getVersionPair();
    const args = await pkgManagerArgs(this.config.get('npmClient'), { command: 'install', pkg: `ionic-angular@${latestVersion ? latestVersion : 'latest'}` });

    return [
      { message: `Visit ${strong('https://github.com/ionic-team/ionic/releases')} for each upgrade's instructions` },
      { message: `If no instructions, run: ${input(args.join(' '))}` },
      { message: `Watch for npm warnings about peer dependencies--they may need manual updating` },
    ];
  }
}

export class IonicAngularMajorUpdateAvailable extends IonicAngularAilment {
  readonly id = 'ionic-angular-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('ionic-angular');
      const latestPkg = await pkgFromRegistry(this.config.get('npmClient'), { pkg: 'ionic-angular' });
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
      `A major update is available for ${strong('ionic-angular')} (${ancillary(currentVersion)} => ${ancillary(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    return [
      { message: `Visit ${strong('https://blog.ionicframework.com')} and ${strong('https://github.com/ionic-team/ionic/releases')} for upgrade instructions` },
    ];
  }
}

export class AppScriptsUpdateAvailable extends IonicAngularAilment implements TreatableAilment {
  readonly id = 'app-scripts-update-available';
  readonly treatable = true;
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('@ionic/app-scripts');
      const latestPkg = await pkgFromRegistry(this.config.get('npmClient'), { pkg: '@ionic/app-scripts' });
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
      `Update available for ${strong('@ionic/app-scripts')}.\n` +
      `An update is available for ${strong('@ionic/app-scripts')} (${ancillary(currentVersion)} => ${ancillary(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'minor' || diff === 'patch';
  }

  async getTreatmentSteps() {
    const [ , latestVersion ] = await this.getVersionPair();
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.config.get('npmClient'), { command: 'install', pkg: `@ionic/app-scripts@${latestVersion ? latestVersion : 'latest'}`, saveDev: true });

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

export class AppScriptsMajorUpdateAvailable extends IonicAngularAilment {
  readonly id = 'app-scripts-major-update-available';
  currentVersion?: string;
  latestVersion?: string;

  async getVersionPair(): Promise<[string, string]> {
    if (!this.currentVersion || !this.latestVersion) {
      const [ currentPkg ] = await this.project.getPackageJson('@ionic/app-scripts');
      const latestPkg = await pkgFromRegistry(this.config.get('npmClient'), { pkg: '@ionic/app-scripts' });
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
      `Major update available for ${strong('@ionic/app-scripts')}.\n` +
      `A major update is available for ${strong('@ionic/app-scripts')} (${ancillary(currentVersion)} => ${ancillary(latestVersion)}).\n`
    ).trim();
  }

  async detected() {
    const [ currentVersion, latestVersion ] = await this.getVersionPair();
    const diff = semver.diff(currentVersion, latestVersion);

    return diff === 'major';
  }

  async getTreatmentSteps() {
    return [
      { message: `Visit ${strong('https://github.com/ionic-team/ionic-app-scripts/releases')} for upgrade instructions` },
    ];
  }
}

export class IonicAngularPackageJsonHasDefaultIonicBuildCommand extends IonicAngularAilment {
  readonly id = 'ionic-angular-package-json-has-default-ionic-build-command';
  currentVersion?: string;
  latestVersion?: string;

  async getMessage() {
    return (
      `The ${strong(BUILD_SCRIPT)} npm script is unchanged.\n` +
      `The Ionic CLI now looks for the ${strong(BUILD_SCRIPT)} npm script in ${strong('package.json')} for a custom build script to run instead of the default (${input(DEFAULT_BUILD_SCRIPT_VALUE)}). If you don't use it, it's considered quicker and cleaner to just remove it.`
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
      { message: `Remove the ${strong(BUILD_SCRIPT)} npm script from ${strong('package.json')}` },
      { message: `Continue using ${input('ionic build')} normally` },
    ];
  }
}

export class IonicAngularPackageJsonHasDefaultIonicServeCommand extends IonicAngularAilment {
  readonly id = 'ionic-angular-package-json-has-default-ionic-serve-command';
  currentVersion?: string;
  latestVersion?: string;

  async getMessage() {
    return (
      `The ${strong(SERVE_SCRIPT)} npm script is unchanged.\n` +
      `The Ionic CLI now looks for the ${strong(SERVE_SCRIPT)} npm script in ${strong('package.json')} for a custom serve script to run instead of the default (${input(DEFAULT_SERVE_SCRIPT_VALUE)}). If you don't use it, it's considered quicker and cleaner to just remove it.`
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
      { message: `Remove the ${strong(SERVE_SCRIPT)} npm script from ${strong('package.json')}` },
      { message: `Continue using ${input('ionic serve')} normally` },
    ];
  }
}
