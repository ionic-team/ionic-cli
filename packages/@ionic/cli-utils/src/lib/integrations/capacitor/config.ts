import { BaseConfig } from '@ionic/cli-framework';
import * as lodash from 'lodash';

export const CAPACITOR_CONFIG_FILE = 'capacitor.config.json';

export interface CapacitorConfigFile {
  webDir?: string;
  server?: {
    url?: string;
    originalUrl?: string;
  };
}

export class CapacitorConfig extends BaseConfig<CapacitorConfigFile> {
  provideDefaults(config: CapacitorConfigFile): CapacitorConfigFile {
    return config;
  }

  setServerUrl(url: string): void {
    const serverConfig = this.get('server') || {};

    if (serverConfig.url) {
      serverConfig.originalUrl = serverConfig.url;
    }

    serverConfig.url = url;

    this.set('server', serverConfig);
  }

  resetServerUrl(): void {
    const serverConfig = this.get('server') || {};

    delete serverConfig.url;

    if (serverConfig.originalUrl) {
      serverConfig.url = serverConfig.originalUrl;
      delete serverConfig.originalUrl;
    }

    if (lodash.isEmpty(serverConfig)) {
      this.unset('server');
    } else {
      this.set('server', serverConfig);
    }
  }
}
