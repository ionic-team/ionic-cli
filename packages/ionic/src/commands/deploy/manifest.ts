import { MetadataGroup } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { map } from '@ionic/utils-array';
import { readdirp, stat, writeFile } from '@ionic/utils-fs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { DeployCoreCommand } from './core';

interface DeployManifestItem {
  href: string;
  size: number;
  integrity: string;
}

export class DeployManifestCommand extends DeployCoreCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'manifest',
      type: 'project',
      summary: 'Generates a manifest file for the deploy service from a built app directory',
      groups: [MetadataGroup.HIDDEN],
    };
  }

  async run(): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic deploy manifest')} outside a project directory.`);
    }
    await this.requireNativeIntegration();

    const buildDir = await this.project.getDistDir();
    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern(buildDir);

    const manifestPath = path.resolve(buildDir, 'pro-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, undefined, 2), { encoding: 'utf8' });
    this.env.log.ok(`Appflow Deploy manifest written to ${input(prettyPath(manifestPath))}!`);
  }

  private async getFilesAndSizesAndHashesForGlobPattern(buildDir: string): Promise<DeployManifestItem[]> {
    const contents = await readdirp(buildDir);
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
