export interface StarterTemplate {
  name: string;
  typeId: string;
  description: string;
  path: string;
  archive: string;
}

export interface StarterTemplateType {
  id: string;
  name: string;
  baseArchive: string;
  buildDependencies: string[];
}
