import * as chalk from 'chalk';

import { IProject, ProjectFile } from '../definitions';
import { BaseConfig } from './config';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';

export class Project extends BaseConfig<ProjectFile> implements IProject {
  public directory: string;

  async loadAppId(): Promise<string> {
    const p = await this.load();

    if (!p.app_id) {
      throw new FatalException(`Your project file (${chalk.bold(prettyPath(this.filePath))}) does not contain '${chalk.bold('app_id')}'. `
                             + `Run '${chalk.bold('ionic cloud:setup')}'.`);  // TODO: we're telling people to do cloud:setup (which is a plugin). is this okay? }
    }

    return p.app_id;
  }

  provideDefaults(o: any): void {
    if (!o.name) {
      o.name = '';
    }

    if (!o.app_id) {
      o.app_id = '';
    }
  }

  is<ProjectFile>(j: any): j is ProjectFile {
    return typeof j.name === 'string' && typeof j.app_id === 'string';
  }
}
