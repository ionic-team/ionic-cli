export interface CordovaServeBuilderSchema {
  cordovaBuildTarget: string;
  devServerTarget: string;
  platform: string;
  port?: number;
  host?: string;
  proxyConfig?: string;
  cordovaBasePath?: string;
  sourceMap?: boolean;
}
