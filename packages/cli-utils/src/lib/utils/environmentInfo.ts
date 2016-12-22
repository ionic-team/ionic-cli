import * as osName from 'os-name';
import { spawn } from 'cross-spawn';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the output of a commandline program
 */
export function getCommandInfo(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let info: string = '';
    const proc = spawn(cmd, args);

    proc.stdout.on('data', (data: Buffer) => {
      info += data.toString('utf8');
    });

    proc.on('error', () => {
      resolve('Not installed');
    });

    proc.on('close', (code: any) => {
      if (code !== 0) {
        return resolve('Not installed');
      }
      resolve(info.replace('\n', ' '));
    });
  });
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
 * Get package.json contents for the ionic(cli) package
 */
export async function getCliInfo(): Promise<{ [key: string]: any; }>  {
  const packageJsonPath = path.resolve(
    process.cwd(),
    'package.json'
  );

  return await getPackageJsonContents(packageJsonPath);
}

/**
 * Get package.json contents for the ionic-angular package
 */
export async function getIonicInfo(): Promise<{ [key: string]: any; }>  {
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
export async function gatherEnvironmentInfo(): Promise<{ [key: string]: any; }>  {

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
