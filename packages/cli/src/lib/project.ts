import * as path from 'path';

import * as chalk from 'chalk';

import { IProject, ProjectFile } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { readJsonFile, writeJsonFile } from './utils/fs';

const PROJECT_FILE = 'ionic.config.json';

function isProjectFile(j: { [key: string]: any }): j is ProjectFile {
  return j['name'] !== undefined;
}

export class Project implements IProject {
  public directory: string;
  public projectFilePath: string;

  protected projectFile?: ProjectFile;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
    this.projectFilePath = path.resolve(this.directory, PROJECT_FILE);
  }

  public async load(): Promise<ProjectFile> {
    if (!this.projectFile) {
      let o = await readJsonFile(this.projectFilePath);

      if (isProjectFile(o)) {
        this.projectFile = o;
      } else {
        throw new FatalException(`The project file (${chalk.bold(prettyPath(this.projectFilePath))}) has an unrecognized format.\n`
                               + `Try recreating or deleting the file.`);
      }
    }

    return await this.projectFile;
  }

  public async loadAppId(): Promise<string> {
    const p = await this.load();

    if (!p.app_id) {
      throw new FatalException(`Your project file (${chalk.bold(prettyPath(this.projectFilePath))}) does not contain '${chalk.bold('app_id')}'. `
                             + `Run '${chalk.bold('ionic cloud:setup')}'.`);  // TODO: we're telling people to do cloud:setup (which is a plugin). is this okay?
    }

    return p.app_id;
  }

  public async save(projectFile: ProjectFile): Promise<void> {
    await writeJsonFile(this.projectFilePath, projectFile);
    this.projectFile = projectFile;
  }
}
