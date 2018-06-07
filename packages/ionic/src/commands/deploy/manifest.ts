import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { map } from '@ionic/cli-framework/utils/array';
import { fsStat, fsWriteFile, readDir } from '@ionic/cli-framework/utils/fs';
import { CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

interface DeployManifestItem {
  href: string;
  size: number;
  integrity: string;
}

export class DeployManifestCommand extends Command {
  buildDir: string = path.resolve(this.env.project.directory, 'www');

  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'manifest',
      type: 'project',
      summary: 'Generates a manifest file for the deploy service from a built app directory',
    };
  }

  async run(): Promise<void> {
    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern();
    await fsWriteFile(path.resolve(this.buildDir, 'pro-manifest.json'), JSON.stringify(manifest, undefined, 2), { encoding: 'utf8' });
  }

  private async getFilesAndSizesAndHashesForGlobPattern(): Promise<DeployManifestItem[]> {
    const contents = await readDir(this.buildDir, { recursive: true });
    const stats = await map(contents, async (f): Promise<[string, fs.Stats]> => [f, await fsStat(f)]);
    const files = stats.filter(([ , stat ]) => !stat.isDirectory());

    const items = await Promise.all(files.map(([f, stat]) => this.getFileAndSizeAndHashForFile(f, stat)));

    return items;
  }

  private async getFileAndSizeAndHashForFile(file: string, stat: fs.Stats): Promise<DeployManifestItem> {
    const buffer = await this.readFile(file);

    return {
      href: path.relative(this.buildDir, file),
      size: stat.size,
      integrity: this.getIntegrity(buffer),
    };
  }

  private async readFile(file: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(file, (err, buffer) => {
        if (err) {
          return reject(err);
        }

        resolve(buffer);
      });
    });
  }

  private getIntegrity(data: Buffer) {
    return ['sha256', 'sha384', 'sha512']
      .map(algorithm => {
        const hash = crypto.createHash(algorithm);
        hash.update(data);
        return algorithm + '-' + hash.digest('base64');
      })
      .join(' ');
  }
}
