export interface ImageResource {
  name: string;
  width: number;
  height: number;
  density: string;
  orientation: 'landscape' | 'portrait';
  platform: string;
  resType: string;
  dest: string;
  imageId: string | null;
  nodeName: string;
  nodeAttributes: string[];
}

export interface ResourcesImageConfig {
  name: string;
  width: number;
  height: number;
  density?: string;
  orientation?: 'landscape' | 'portrait';
}

export interface SourceImage {
  ext: string;
  imageId?: string;
  platform: string;
  resType: string;
  path: string;
  vector: boolean;
  width: number;
  height: number;
}

export interface ImageUploadResponse {
  Error: string;
  Width: number;
  Height: number;
  Type: string;
  Vector: boolean;
}

export interface ResourcesConfig {
  [propName: string]: {
    [imgType: string]: {
      images: ResourcesImageConfig[],
      nodeName: string,
      nodeAttributes: string[]
    }
  };
}

export type KnownPlatform = 'ios' | 'android' | 'wp8';
export type KnownResourceType = 'icon' | 'splash';
