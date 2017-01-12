export interface ImageResource {
  name: string;
  width: number;
  height: number;
  density: string;
  platform: string;
  resType: string;
  dest: string;
  imageId: string | null;
  nodeName: string;
  nodeAttributes: string[];
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
