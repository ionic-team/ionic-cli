import { BaseConfig } from '@ionic/cli-framework';
import * as lodash from 'lodash';

export const CAPACITOR_CONFIG_JSON_FILE = 'capacitor.config.json';

export interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    url?: string;
    originalUrl?: string;
  };
}

export class CapacitorJSONConfig extends BaseConfig<CapacitorConfig> {
  constructor(p: string) {
    super(p, { spaces: '\t' });
  }

  provideDefaults(config: CapacitorConfig): CapacitorConfig {
    return config;
  }

  setServerUrl(url: string): void {
    const serverConfig = this.get('server') || {};

    if (typeof serverConfig.url === 'string') {
      serverConfig.originalUrl = serverConfig.url;
    }

    if (typeof serverConfig.cleartext === 'boolean') {
      serverConfig.originalCleartext = serverConfig.cleartext;
    }

    serverConfig.url = url;
    serverConfig.cleartext = true;

    this.set('server', serverConfig);
  }

  resetServerUrl(): void {
    const serverConfig = this.get('server') || {};

    delete serverConfig.url;
    delete serverConfig.cleartext;

    if (serverConfig.originalUrl) {
      serverConfig.url = serverConfig.originalUrl;
      delete serverConfig.originalUrl;
    }

    if (serverConfig.originalCleartext) {
      serverConfig.cleartext = serverConfig.originalCleartext;
      delete serverConfig.originalCleartext;
    }

    if (lodash.isEmpty(serverConfig)) {
      this.unset('server');
    } else {
      this.set('server', serverConfig);
    }
  }
}
