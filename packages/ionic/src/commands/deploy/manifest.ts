import { MetadataGroup } from '@ionic/cli-framework';
import { map } from '@ionic/utils-array';
import { readdirp, stat, writeFile } from '@ionic/utils-fs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { CommandMetadata } from '../../definitions';
import { input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { CAPACITOR_CONFIG_FILE, CapacitorConfig } from '../../lib/integrations/capacitor/config';

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
      groups: [MetadataGroup.HIDDEN],
    };
  }

  async run(): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic deploy manifest')} outside a project directory.`);
    }

    let buildDir: string;
    if (this.project.getIntegration('capacitor') !== undefined) {
      const conf = new CapacitorConfig(path.resolve(this.project.directory, CAPACITOR_CONFIG_FILE));
      const webDir = conf.get('webDir');
      if (webDir) {
        buildDir = webDir;
      } else {
        throw new FatalException(`WebDir parameter has no value set in the Capacitor config file ${input(CAPACITOR_CONFIG_FILE)}`);
      }
    } else if (this.project.getIntegration('cordova') !== undefined) {
      // for cordova it is hardcoded because www is mandatory
      buildDir = path.resolve(this.project.directory, 'www');
    } else {
      throw new FatalException(
        `It looks like your app isn't integrated with Capacitor or Cordova.\n` +
        `In order to generate a manifestfor the Appflow Deploy plugin, you will need to integrate your app with Capacitor or Cordova. See the docs for setting up native projects:\n\n` +
        `iOS: ${strong('https://ionicframework.com/docs/building/ios')}\n` +
        `Android: ${strong('https://ionicframework.com/docs/building/android')}\n`
      );
    }

    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern(buildDir);

    const manifestPath = path.resolve(buildDir, 'pro-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, undefined, 2), { encoding: 'utf8' });
    this.env.log.ok(`Manifest ${input(manifestPath)} correctly generated\n`);
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
