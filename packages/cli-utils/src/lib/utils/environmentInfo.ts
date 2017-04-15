import { EnvironmentInfo, PackageJson } from '../../definitions';
import { readIonicAngularPackageJsonFile, readCliPackageJsonFile, readAppScriptsPackageJsonFile } from './npm';
import { load } from '../modules';
import { runcmd } from './shell';

export async function getCommandInfo(cmd: string, args: string[]): Promise<string> {
  try {
    const out = await runcmd(cmd, args);
    return out.split('\n').join(' ');
  } catch (e) {
    return 'not installed';
  }
}

/**
 * Get all useful environment information
 */
export async function gatherEnvironmentInfo(): Promise<EnvironmentInfo> {
  const osName = load('os-name');
  const os = osName();
  const node = process.version;
  let ionicAngularPackageJson: PackageJson | undefined;
  let appScriptsPackageJson: PackageJson | undefined;
  let cliPackageJson: PackageJson | undefined;

  try { ionicAngularPackageJson = await readIonicAngularPackageJsonFile(); } catch (e) {}
  try { appScriptsPackageJson = await readAppScriptsPackageJsonFile(); } catch (e) {}
  try { cliPackageJson = await readCliPackageJsonFile(); } catch (e) {}

  const [
    cordovaVersion,
    xcode,
    iosDeploy,
    iosSim,
  ] = await Promise.all([
    getCommandInfo('cordova', ['-v']),
    getCommandInfo('/usr/bin/xcodebuild', ['-version']),
    getCommandInfo('ios-deploy', ['--version']),
    getCommandInfo('ios-sim', ['--version']),
  ]);

  return {
    cordovaVersion,
    iosDeploy,
    iosSim,
    os,
    node,
    xcode,
    ionic: ionicAngularPackageJson ? ionicAngularPackageJson.version : 'not installed',
    appScripts: appScriptsPackageJson ? appScriptsPackageJson.version : 'not installed',
    cli: cliPackageJson ? cliPackageJson.version : 'not installed',
  };
}
