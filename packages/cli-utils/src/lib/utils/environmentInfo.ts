import * as path from 'path';
import * as fs from 'fs';

import { EnvironmentInfo } from '../../definitions';
import { load } from '../modules';
import { runcmd } from './shell';

export async function getCommandInfo(cmd: string, args: string[]): Promise<string> {
  try {
    const out = await runcmd(cmd, args);
    return out.split('\n').join(' ');
  } catch (e) {
    return 'Not installed';
  }
}

/**
 * Get the contents of a package.json file in JSON format
 */
function getPackageJsonContents(packageJsonPath: string): Promise<{ [key: string]: any; }> {
  return new Promise((resolve, reject) => {
    let packageJson = {};

    try {
      fs.readFile(packageJsonPath, 'utf8', (err: any, dataString: string) => {
        if (!err) {
          packageJson = JSON.parse(dataString);
        }
        resolve(packageJson);
      });
    } catch (e) {
      resolve(packageJson);
    }
  });
}

/**
 * Get package.json contents for the project package
 */
export async function getProjectInfo(appDirectory: string) {
  const packageJsonPath = path.resolve(
    appDirectory,
    'package.json'
  );

  return await getPackageJsonContents(packageJsonPath);
}

/**
 * Get package.json contents for the ionic(cli) package
 */
export async function getCliInfo() {
  const packageJsonPath = path.resolve(
    process.env.CLI_BIN_DIR,
    '..',
    'package.json'
  );

  return await getPackageJsonContents(packageJsonPath);
}

/**
 * Get package.json contents for the ionic-angular package
 */
export async function getIonicInfo() {
  const appDirectory = '.'; /* TODO: change this */
  const packageJsonPath = path.resolve(
    appDirectory,
    'node_modules',
    'ionic-angular',
    'package.json'
  );

  return await getPackageJsonContents(packageJsonPath);
}

/**
 * Get all useful environment information
 */
export async function gatherEnvironmentInfo(): Promise<EnvironmentInfo> {
  const osName = load('os-name');
  const os = osName();
  const node = process.version;
  let cordovaVersion: string;
  let xcode: string;
  let iosDeploy: string;
  let iosSim: string;
  let cliInfo: { [key: string]: any; };
  let ionicInfo: { [key: string]: any; };
  [
    cordovaVersion,
    xcode,
    iosDeploy,
    iosSim,
    cliInfo,
    ionicInfo
  ] = await Promise.all([
    getCommandInfo('cordova', ['-v']),
    getCommandInfo('/usr/bin/xcodebuild', ['-version']),
    getCommandInfo('ios-deploy', ['--version']),
    getCommandInfo('ios-sim', ['--version']),
    getCliInfo(),
    getIonicInfo()
  ]);

  return {
    cordovaVersion,
    ionic: ionicInfo['version'],
    cli: cliInfo['version'],
    iosDeploy,
    iosSim,
    os,
    node,
    xcode
  };
}
