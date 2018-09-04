import chalk from 'chalk';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { map } from '@ionic/cli-framework/utils/array';
import { CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { readDirp, stat, writeFile } from '@ionic/utils-fs';

interface DeployManifestItem {
  href: string;
  size: number;
  integrity: string;
}

export class DeployManifestCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'manifest',
      type: 'project',
      summary: 'Generates a manifest file for the deploy service from a built app directory',
    };
  }

  async run(): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic deploy manifest')} outside a project directory.`);
    }

    const buildDir = path.resolve(this.project.directory, 'www'); // TODO: this is hard-coded
    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern(buildDir);

    await writeFile(path.resolve(buildDir, 'pro-manifest.json'), JSON.stringify(manifest, undefined, 2), { encoding: 'utf8' });
  }

  private async getFilesAndSizesAndHashesForGlobPattern(buildDir: string): Promise<DeployManifestItem[]> {
    const contents = await readDirp(buildDir);
    const stats = await map(contents, async (f): Promise<[string, fs.Stats]> => [f, await stat(f)]);
    const files = stats.filter(([ , stat ]) => !stat.isDirectory());

    const items = await Promise.all(files.map(([f, stat]) => this.getFileAndSizeAndHashForFile(buildDir, f, stat)));

    return items.filter(item => item.href !== 'pro-manifest.json');
  }

  private async getFileAndSizeAndHashForFile(buildDir: string, file: string, stat: fs.Stats): Promise<DeployManifestItem> {
    const buffer = await this.readFile(file);

    return {
      href: path.relative(buildDir, file),
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
