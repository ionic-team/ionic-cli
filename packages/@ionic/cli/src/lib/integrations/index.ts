import { BaseConfig } from '@ionic/cli-framework';
import { PromptModule } from '@ionic/cli-framework-prompts';
import * as path from 'path';

import {
  IClient,
  IConfig,
  IIntegration,
  ILogger,
  IProject,
  ISession,
  IShell,
  InfoItem,
  IntegrationAddDetails,
  IntegrationName,
  ProjectIntegration,
  ProjectPersonalizationDetails
} from '../../definitions';
import { isIntegrationName } from '../../guards';
import { strong } from '../color';
import { IntegrationNotFoundException } from '../errors';
import type { Integration as CapacitorIntegration } from './capacitor';
import type { Integration as CordovaIntegration } from './cordova';
import type { Integration as EnterpriseIntegration } from './enterprise';

export { INTEGRATION_NAMES } from '../../guards';

export interface IntegrationOptions {
  quiet?: boolean;
}

export interface IntegrationDeps {
  readonly prompt: PromptModule;
  readonly client: IClient;
  readonly session: ISession;
  readonly config: IConfig;
  readonly shell: IShell;
  readonly project: IProject;
  readonly log: ILogger;
}

export class IntegrationConfig extends BaseConfig<ProjectIntegration> {
  provideDefaults(c: Partial<Readonly<ProjectIntegration>>): ProjectIntegration {
    return {};
  }
}

export abstract class BaseIntegration<T extends ProjectIntegration> implements IIntegration<T> {
  abstract readonly name: IntegrationName;
  abstract readonly summary: string;
  abstract readonly archiveUrl?: string;
  abstract readonly config: BaseConfig<T>;

  constructor(protected readonly e: IntegrationDeps) {}

  static async createFromName(deps: IntegrationDeps, name: 'capacitor'): Promise<CapacitorIntegration>;
  static async createFromName(deps: IntegrationDeps, name: 'cordova'): Promise<CordovaIntegration>;
  static async createFromName(deps: IntegrationDeps, name: 'enterprise'): Promise<EnterpriseIntegration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<CapacitorIntegration | CordovaIntegration | EnterpriseIntegration>;
  static async createFromName(deps: IntegrationDeps, name: IntegrationName): Promise<CapacitorIntegration | CordovaIntegration | EnterpriseIntegration> {
    if (isIntegrationName(name)) {
      const { Integration } = await import(`./${name}`);
      return new Integration(deps);
    }

    throw new IntegrationNotFoundException(`Bad integration name: ${strong(name)}`); // TODO?
  }

  async getInfo(): Promise<InfoItem[]> {
    return [];
  }

  isAdded(): boolean {
    return !!this.e.project.config.get('integrations')[this.name];
  }

  isEnabled(): boolean {
    const integrationConfig = this.e.project.config.get('integrations')[this.name];
    return !!integrationConfig && integrationConfig.enabled !== false;
  }

  async enable(config?: ProjectIntegration): Promise<void> {
    if (config && config.root) {
      this.config.set('root', config.root);
    }
    this.config.unset('enabled');
  }

  async disable(): Promise<void> {
    this.config.set('enabled', false);
  }

  async personalize(details: ProjectPersonalizationDetails) {
    // optionally overwritten by subclasses
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    const config = details.root !== this.e.project.directory ?
      { root: path.relative(this.e.project.rootDirectory, details.root) } :
      undefined;

    await this.enable(config);
  }
}
