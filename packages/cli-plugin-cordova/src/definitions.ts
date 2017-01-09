export interface ImageResource {
  name: string;
  width: number;
  height: number;
  density: string;
  platform: string;
  resType: string;
  dest: string;
  src: string | null;
  nodeName: string;
  nodeAttributes: string[];
}

export interface SourceImage {
  ext: string;
  platform: string;
  resType: string;
  path: string;
}
