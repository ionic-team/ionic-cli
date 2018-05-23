import { BaseConfig } from '@ionic/cli-framework';

export interface ConfigFileProxy {
  path: string;
  proxyUrl: string;
  proxyNoAgent?: boolean;

  /**
   * @deprecated
   */
  rejectUnauthorized?: boolean;
}

export interface ConfigFile {
  watchPatterns?: string[];
  proxies?: ConfigFileProxy[];
  documentRoot?: string;
}

export class Config extends BaseConfig<ConfigFile> {
  provideDefaults(c: Partial<Readonly<ConfigFile>>): ConfigFile {
    return {};
  }
}
