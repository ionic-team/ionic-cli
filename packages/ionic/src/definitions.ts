import { ProjectType } from '@ionic/cli-utils';

export interface StarterTemplate {
  name: string;
  type: ProjectType;
  description: string;
  path: string;
  archive: string;
}

export interface StarterTemplateType {
  id: string;
  name: string;
  baseArchive: string;
  globalDependencies: string[];
  localDependencies: string[];
}
