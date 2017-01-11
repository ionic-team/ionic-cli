import * as xml2js from 'xml2js';
import * as path from 'path';
import { ERROR_FILE_NOT_FOUND, fsReadFile, promisify } from '@ionic/cli-utils';

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

/**
 * get orientation information from the config.xml cordova file structure
 */
export function getOrientationConfigData(configData: any): string | undefined {
  if (configData.widget && configData.widget.preference) {
    var n = configData.widget.preference.find((d: any) => {
      return d && d.$ && d.$.name && d.$.name.toLowerCase() === 'orientation';
    });
    if (n && n.$ && n.$.value) {
      return n.$.value.toLowerCase();
    }
  }
}
