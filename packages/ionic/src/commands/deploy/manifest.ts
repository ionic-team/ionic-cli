import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { CommandGroup, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { fsReadFile, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import * as klaw from 'klaw';

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
      groups: [CommandGroup.Hidden], // TODO: make part of start?
    };
  }

  async run(): Promise<void> {
    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern();
    await fsWriteFile(path.resolve(this.buildDir, 'pro-manifest.json'), JSON.stringify(manifest), { encoding: 'utf8' });
  }

  private async getFilesAndSizesAndHashesForGlobPattern(): Promise<DeployManifestItem[]> {
    const items: Promise<DeployManifestItem>[] = [];

    return new Promise<DeployManifestItem[]>((resolve, reject) => {
      klaw(this.buildDir)
        .on('data', item => {
          if (item.stats.isFile()) {
            items.push(this.getFileAndSizeAndHashForFile(item.path, item.stats));
          }
        })
        .on('error', err => reject(err))
        .on('end', async () => resolve(await Promise.all(items)));
    });
  }

  private async getFileAndSizeAndHashForFile(file: string, stat: fs.Stats): Promise<DeployManifestItem> {
    const buffer: any = await fsReadFile(file, {encoding: (undefined as any)});

    return {
      href: path.relative(this.buildDir, file),
      size: stat.size,
      integrity: this.getIntegrity(buffer),
    };
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
