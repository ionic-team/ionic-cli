import { BaseConfig } from "@ionic/cli-framework";
import lodash = require("lodash");

export interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    url?: string;
    originalUrl?: string;
  };
}

export interface CapacitorCLIConfig {
  android: {
    platformDirAbs: string;
    srcMainDirAbs: string;
    assetsDirAbs: string;
  };
  ios: {
    platformDirAbs: string;
    nativeTargetDirAbs: string;
  };
  app: {
    extConfig: CapacitorConfig;
  };
}

export class CapacitorJSONConfig extends BaseConfig<CapacitorConfig> {
  constructor(p: string) {
    super(p, { spaces: "\t" });
  }

  provideDefaults(config: CapacitorConfig): CapacitorConfig {
    return config;
  }

  setServerUrl(url: string): void {
    const serverConfig = this.get("server") || {};

    if (typeof serverConfig.url === "string") {
      serverConfig.originalUrl = serverConfig.url;
    }

    serverConfig.url = url;

    this.set("server", serverConfig);
  }

  resetServerUrl(): void {
    const serverConfig = this.get("server") || {};

    delete serverConfig.url;

    if (serverConfig.originalUrl) {
      serverConfig.url = serverConfig.originalUrl;
      delete serverConfig.originalUrl;
    }

    if (lodash.isEmpty(serverConfig)) {
      this.unset("server");
    } else {
      this.set("server", serverConfig);
    }
  }
}
