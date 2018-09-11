export interface CordovaBuildBuilderSchema {
  browserTarget: string;
  platform: string;
  cordovaBasePath?: string;
  sourceMap?: boolean;
  cordovaAssets?: boolean;
}
