import { MetadataGroup } from '@ionic/cli-framework';
import { LOGGER_LEVELS } from '@ionic/cli-framework-output';
import { map } from '@ionic/utils-array';
import { pathExists, readdirp, stat, writeFile } from '@ionic/utils-fs';
import { prettyPath } from '@ionic/utils-terminal';
import crypto from 'crypto';
import fs from 'fs';
import lodash from 'lodash';
import path from 'path';
import Debug from 'debug';

import { CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { prependNodeModulesBinToPath, Shell } from '../../lib/shell';
import { createDefaultLoggerHandlers, Logger } from '../../lib/utils/logger';

import { CapacitorCLIConfig, CapacitorConfig, CapacitorJSONConfig } from './capacitor';
import { LiveUpdatesCoreCommand } from './core';

const debug = Debug('ionic:commands:live-update:manifest');
const CAPACITOR_CONFIG_JSON_FILE = 'capacitor.config.json';

interface LiveUpdatesManifestItem {
  href: string;
  size: number;
  integrity: string;
}

export class LiveUpdatesManifestCommand extends LiveUpdatesCoreCommand {
  async getMetadata(): Promise<CommandMetadata> {
    // This command is set as type 'global' in order to support Capacitor apps without an ionic.config.json
    return {
      name: 'manifest',
      type: 'global',
      summary: 'Generates a manifest file for the Ionic Live Updates service from a built app directory',
      groups: [MetadataGroup.PAID],
    };
  }

  async run(): Promise<void> {
    const capacitorConfig = await this.getCapacitorConfig();
    if (!this.project && !capacitorConfig) {
      throw new FatalException(`Cannot run ${input('ionic live-update manifest')} outside a project directory.`);
    }

    let buildDir: string;
    if (this.project) {
      await this.requireNativeIntegration();
      buildDir = await this.project.getDistDir();
    } else {
      buildDir = capacitorConfig!.webDir ? capacitorConfig!.webDir : 'www';
    }

    const manifest = await this.getFilesAndSizesAndHashesForGlobPattern(buildDir);

    const manifestPath = path.resolve(buildDir, 'pro-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, undefined, 2), { encoding: 'utf8' });
    this.env.log.ok(`Ionic Live Updates manifest written to ${input(prettyPath(manifestPath))}!`);
  }

  private async getFilesAndSizesAndHashesForGlobPattern(buildDir: string): Promise<LiveUpdatesManifestItem[]> {
    const contents = await readdirp(buildDir, { filter: item => !/(css|js)\.map$/.test(item.path) });
    const stats = await map(contents, async (f): Promise<[string, fs.Stats]> => [f, await stat(f)]);
    const files = stats.filter(([ , s ]) => !s.isDirectory());

    const items = await Promise.all(files.map(([f, s]) => this.getFileAndSizeAndHashForFile(buildDir, f, s)));

    return items.filter(item => item.href !== 'pro-manifest.json');
  }

  private async getFileAndSizeAndHashForFile(buildDir: string, file: string, s: fs.Stats): Promise<LiveUpdatesManifestItem> {
    const buffer = await this.readFile(file);

    return {
      href: path.relative(buildDir, file),
      size: s.size,
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

  private getCapacitorConfigJsonPath(): string {
    return path.resolve(this.env.ctx.execPath, CAPACITOR_CONFIG_JSON_FILE);
  }

  private getCapacitorCLIConfig = lodash.memoize(async (): Promise<CapacitorCLIConfig | undefined> => {
    // I had to create a new shell to force prependNodeModulesBinToPath.
    // If ionic.config.json is not present, then this.env.shell will not implement this, and the Capacitor command will fail.
    const args = ['config', '--json'];
    const log = new Logger({
      level: LOGGER_LEVELS.INFO,
      handlers: createDefaultLoggerHandlers(),
    });
    const shell = new Shell({ log }, { alterPath: p => { return prependNodeModulesBinToPath(this.env.ctx.execPath, p)} });

    debug('Getting config with Capacitor CLI: %O', args);

    const output = await shell.cmdinfo('capacitor', args);

    if (!output) {
      debug('Could not get config from Capacitor CLI (probably old version)');
      return;
    }

    try {
      return JSON.parse(output);
    } catch(e) {
      debug('Could not get config from Capacitor CLI (probably old version)', e);
      return;
    }
  });

  private getCapacitorConfig = lodash.memoize(async (): Promise<CapacitorConfig | undefined> => {
    const cli = await this.getCapacitorCLIConfig();

    if (cli) {
      debug('Loaded Capacitor config!');
      return cli.app.extConfig;
    }

    // fallback to reading capacitor.config.json if it exists
    const confPath = this.getCapacitorConfigJsonPath();

    if (!(await pathExists(confPath))) {
      debug('Capacitor config file does not exist at %O', confPath);
      debug('Failed to load Capacitor config');
      return;
    }

    const conf = new CapacitorJSONConfig(confPath);
    const extConfig = conf.c;

    debug('Loaded Capacitor config!');

    return extConfig;
  });
}
