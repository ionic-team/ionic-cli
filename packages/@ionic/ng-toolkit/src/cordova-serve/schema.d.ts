export interface CordovaServeBuilderSchema {
  cordovaBuildTarget: string;
  devServerTarget: string;
  platform: string;
  port?: number;
  host?: string;
  cordovaBasePath?: string;
}
