import * as xml2js from 'xml2js';
import * as path from 'path';
import { ERROR_FILE_NOT_FOUND, fsReadFile, fsWriteFile, promisify } from '@ionic/cli-utils';

export async function parseConfigXml(projectDir: string): Promise<any> {
  const configFilePath = path.join(projectDir, 'config.xml');
  const promisedParseString = promisify<any, string>(xml2js.parseString);

  try {
    let configFileContents = await fsReadFile(configFilePath, { encoding: 'utf8' });
    return await promisedParseString(configFileContents);
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`Cordova config.xml file was not found in ${projectDir}`);
    }
    throw e;
  };
}

export async function writeConfigXml(projectDir: string, configData: any) {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(configData);
  const configFilePath = path.join(projectDir, 'config.xml');

  await fsWriteFile(configFilePath, xml, { encoding: 'utf8' });
}

/**
 * get orientation information from the config.xml cordova file structure
 */
export function getOrientationConfigData(configData: any): string | undefined {
  if (!configData.widget || !configData.widget.preference) {
    return;
  }
  var n = configData.widget.preference.find((d: any) => {
    return d && d.$ && d.$.name && d.$.name.toLowerCase() === 'orientation';
  });
  if (n && n.$ && n.$.value) {
    return n.$.value.toLowerCase();
  }
}

export function getPlatformConfigData(configData: any, platform: string): string | undefined {
  if (!configData.widget || !configData.widget.platform) {
    return;
  }
  return configData.widget.platform.find((d: any) => {
    return d && d.$ && d.$.name === platform;
  });
}
