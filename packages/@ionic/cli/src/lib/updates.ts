import { PackageJson } from '@ionic/cli-framework';
import { readJson, writeJson } from '@ionic/utils-fs';
import { stringWidth } from '@ionic/utils-terminal';
import * as path from 'path';
import * as semver from 'semver';

import { IConfig, IonicEnvironment } from '../definitions';

import { input, success, weak } from './color';
import { sendMessage } from './helper';
import { pkgFromRegistry, pkgManagerArgs } from './utils/npm';

const UPDATE_CONFIG_FILE = 'update.json';
const UPDATE_CHECK_INTERVAL = 60 * 60 * 24 * 1000; // 1 day
const UPDATE_NOTIFY_INTERVAL = 60 * 60 * 12 * 1000; // 12 hours
const PACKAGES = ['@ionic/cli', 'native-run', 'cordova-res'];

export interface PersistedPackage {
  name: string;
  version: string;
}

export interface UpdateConfig {
  lastUpdate?: string;
  lastNotify?: string;
  packages: PersistedPackage[];
}

export async function readUpdateConfig(dir: string): Promise<UpdateConfig> {
  return readJson(path.resolve(dir, UPDATE_CONFIG_FILE));
}

export async function writeUpdateConfig(dir: string, config: UpdateConfig): Promise<void> {
  await writeJson(path.resolve(dir, UPDATE_CONFIG_FILE), config, { spaces: 2 });
}

export interface GetUpdateConfigDeps {
  readonly config: IConfig;
}

export async function getUpdateConfig({ config }: GetUpdateConfigDeps): Promise<UpdateConfig> {
  const dir = path.dirname(config.p);

  try {
    return await readUpdateConfig(dir);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      process.stderr.write(`${e.stack ? e.stack : e}\n`);
    }

    return { packages: [] };
  }
}

export interface PersistPackageVersionsDeps {
  readonly config: IConfig;
}

export async function runUpdateCheck({ config }: PersistPackageVersionsDeps): Promise<void> {
  const dir = path.dirname(config.p);

  const pkgs: readonly PackageJson[] =
    (await Promise.all(PACKAGES.map(pkg => pkgFromRegistry(config.get('npmClient'), { pkg }))))
    .filter((pkg): pkg is PackageJson => typeof pkg !== 'undefined');

  const updateConfig = await getUpdateConfig({ config });

  const newUpdateConfig: UpdateConfig = {
    ...updateConfig,
    lastUpdate: new Date().toISOString(),
    packages: pkgs.map(pkg => ({
      name: pkg.name,
      version: pkg.version,
    })),
  };

  await writeUpdateConfig(dir, newUpdateConfig);
}

export async function runNotify(env: IonicEnvironment, pkg: PersistedPackage, latestVersion: string): Promise<void> {
  const dir = path.dirname(env.config.p);
  const args = await pkgManagerArgs(env.config.get('npmClient'), { command: 'install', pkg: pkg.name, global: true });
  const lines = [
    `Ionic CLI update available: ${weak(pkg.version)} → ${success(latestVersion)}`,
    `Run ${input(args.join(' '))} to update`,
  ];

  // TODO: Pull this into utils/format

  const padding = 3;
  const longestLineLength = Math.max(...lines.map(line => stringWidth(line)));
  const horizontalRule = `  ${'─'.repeat(longestLineLength + padding * 2)}`;
  const output = (
    `\n${horizontalRule}\n\n` +
    `${lines.map(line => `  ${' '.repeat((longestLineLength - stringWidth(line)) / 2 + padding)}${line}`).join('\n')}\n\n` +
    `${horizontalRule}\n\n`
  );

  process.stderr.write(output);

  const updateConfig = await getUpdateConfig(env);
  updateConfig.lastNotify = new Date().toISOString();
  await writeUpdateConfig(dir, updateConfig);
}

export async function runUpdateNotify(env: IonicEnvironment, pkg: PackageJson): Promise<void> {
  const { name, version } = pkg;
  const { lastUpdate, lastNotify, packages } = await getUpdateConfig(env);
  const latestPkg = packages.find(pkg => pkg.name === name);
  const latestVersion = latestPkg ? latestPkg.version : undefined;

  if ((!lastNotify || new Date(lastNotify).getTime() + UPDATE_NOTIFY_INTERVAL < new Date().getTime()) && latestVersion && semver.gt(latestVersion, version)) {
    await runNotify(env, pkg, latestVersion);
  }

  if (!lastUpdate || new Date(lastUpdate).getTime() + UPDATE_CHECK_INTERVAL < new Date().getTime()) {
    await sendMessage(env, { type: 'update-check' });
  }
}
