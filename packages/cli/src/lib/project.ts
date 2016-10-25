import * as path from 'path';

import * as chalk from 'chalk';

import { IProject, ProjectFile } from '../definitions';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { readJsonFile, writeJsonFile } from './utils/json';

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

  public async save(projectFile: ProjectFile): Promise<void> {
    await writeJsonFile(projectFile, this.projectFilePath);
    this.projectFile = projectFile;
  }
}
