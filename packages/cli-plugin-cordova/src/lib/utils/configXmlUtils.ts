import * as xml2js from 'xml2js';
import * as path from 'path';
import { ERROR_FILE_NOT_FOUND, fsReadFile, fsWriteFile, promisify } from '@ionic/cli-utils';


/**
 * get orientation information from the config.xml cordova file structure
 */
export function getOrientationConfigData(configData: any): string | undefined {
  if (!configData.widget.preference) {
    return;
  }
  var n = configData.widget.preference.find((d: any) => {
    return d && d.$ && d.$.name && d.$.name.toLowerCase() === 'orientation';
  });
  if (n && n.$ && n.$.value) {
    return n.$.value.toLowerCase();
  }
}

/**
 *
 */
export function getPlatformConfigData(configData: any, platform: string): string | undefined {
  if (!configData.widget.platform) {
    return;
  }
  return configData.widget.platform.find((d: any) => {
    return d && d.$ && d.$.name === platform;
  });
}

/**
 *
 */
export async function parseConfigXml(projectDir: string): Promise<any> {
  const configFilePath = path.join(projectDir, 'config.xml');
  let configJson: any = null;
  const parseString = promisify<any, string>(xml2js.parseString);

  try {
    let configFileContents = await fsReadFile(configFilePath, { encoding: 'utf8' });
    configJson = await parseString(configFileContents);
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`Cordova config.xml file was not found in ${projectDir}`);
    }
    throw e;
  };

  if (!configJson.widget) {
    throw new Error('\nYour config.xml file is invalid. You must have a <widget> element.');
  }
  return configJson;
}

/**
 *
 */
export async function writeConfigXml(projectDir: string, configData: any) {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(configData);
  const configFilePath = path.join(projectDir, 'config.xml');

  await fsWriteFile(configFilePath, xml, { encoding: 'utf8' });
}

/**
 *
 */
export async function setSrcContent(projectDir: string, devServerUrl: string) {
  const configJson = await parseConfigXml(projectDir);

  // If there is no content element then throw an error
  if (!configJson.widget.content) {
    throw new Error('\nYour config.xml file does not have a <content> element. ' +
                    '\nAdd something like: <content src="index.html"/>');
  }

  if (!configJson.widget.content[0].$['original-src']) {
    configJson.widget.content[0].$['original-src'] = configJson.widget.content[0].$.src;
  }

  if (configJson.widget.content[0].$.src !== devServerUrl) {
    configJson.widget.content[0].$.src = devServerUrl;

    // Check if they have the allow-navigation entry for our dev server
    var allowNavigation = configJson.widget['allow-navigation'];
    var allowNavNode = {
      $: {
        href: devServerUrl
      }
    };

    if (!allowNavigation) {
      // They don't have any allow-navigations, so we need to create a new node
      configJson.widget['allow-navigation'] = [ allowNavNode ];
    } else {
      var foundAllowNav = false;
      for (var i = 0 ; i < allowNavigation.length; i++) {
        if (allowNavigation[i].$.href === devServerUrl) {
          foundAllowNav = true;
        }
      }
      if (!foundAllowNav) {
        configJson.widget['allow-navigation'].push(allowNavNode);
      }
    }
  }
  await writeConfigXml(projectDir, configJson);
}

/**
 * Set config.xml src url back to its original url
 */
export async function resetSrcContent(projectDir: string) {
  const configJson = await parseConfigXml(projectDir);

  // If there is no content element then throw an error
  if (!configJson.widget.content) {
    throw new Error('\nYour config.xml file does not have a <content> element. ' +
                    '\nAdd something like: <content src="index.html"/>');
  }

  /**
   * If 'original-src' exists then take its contents and set them to 'src' and
   * delete the 'original-src' node
   */

  if (configJson.widget.content[0].$['original-src']) {
    configJson.widget.content[0].$.src = configJson.widget.content[0].$['original-src'];
    delete configJson.widget.content[0].$['original-src'];

    await writeConfigXml(projectDir, configJson);
  }
}
