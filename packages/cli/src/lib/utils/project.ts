import * as fs from 'fs';
import * as path from 'path';

import { IProject, ProjectFile } from '../../definitions';

const PROJECT_FILE = 'ionic.config.json';
const ERROR_PROJECT_FILE_NOT_FOUND = 'PROJECT_FILE_NOT_FOUND';

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
      try {
        this.projectFile = await getJsonFileContents(this.projectFilePath);
      } catch (e) {
        if (e.code === 'ENOENT') {
          throw ERROR_PROJECT_FILE_NOT_FOUND;
        }

        throw e;
      }
    }

    if (!this.projectFile) {
      throw 'hi';
    }

    return await this.projectFile;
  }

  public async save(projectFile: ProjectFile): Promise<void> {
    await updateJsonFileContents(projectFile, this.projectFilePath);
    this.projectFile = projectFile;
  }
}

function getJsonFileContents(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err: any, dataString: string) => {
      if (err) {
        return reject(err);
      }

      try {
        resolve(JSON.parse(dataString));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function updateJsonFileContents(fileContents: any, filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    var jsonString = JSON.stringify(fileContents, null, 2);

    fs.writeFile(filePath, jsonString, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
