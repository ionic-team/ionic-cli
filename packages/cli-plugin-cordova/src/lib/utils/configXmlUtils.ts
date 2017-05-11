import * as path from 'path';
import { ERROR_FILE_NOT_FOUND, fsReadFile, fsWriteFile, promisify } from '@ionic/cli-utils';

import { ResourcesImageConfig, KnownPlatform, ResourcesConfig } from '../../definitions';
import { load } from '../modules';


/**
 * Get orientation information from the Json structure of Config.xml
 */
export function getOrientationFromConfigJson(configJson: any): string | undefined {
  if (!configJson.widget.preference) {
    return;
  }
  var n = configJson.widget.preference.find((d: any) => {
    return d && d.$ && d.$.name && d.$.name.toLowerCase() === 'orientation';
  });
  if (n && n.$ && n.$.value) {
    return n.$.value.toLowerCase();
  }
}

/**
 * Get the provided platforms information from the Json structure of Config.xml
 */
export function getPlatformConfigJson(configJson: any, platform: string): string | undefined {
  if (!configJson.widget.platform) {
    return;
  }
  return configJson.widget.platform.find((d: any) => {
    return d && d.$ && d.$.name === platform;
  });
}

/**
 * Add provided images to the platform node of the Json structure of Config.xml
 */
export function addPlatformImagesToConfigJson(configJson: any, platform: KnownPlatform, images: ResourcesConfig): any {
  let configContents = JSON.parse(JSON.stringify(configJson));

  function createImageElement(platform: KnownPlatform, resourceType: string) {
    return (image: ResourcesImageConfig) => {
      var iconDir = ['resources', platform, resourceType, image.name].join('/');
      if (platform === 'android') {
        return {
          $: {
            src: iconDir,
            density: image.density
          }
        };
      } else {
        return {
          $: {
            src: iconDir,
            width: image.width,
            height: image.height
          }
        };
      }
    };
  }

  const platformIndex = configContents.widget.platform.findIndex((pl: any) => pl['$'].name === platform);
  Object.keys(images[platform]).forEach((resType) => {
    configContents.widget.platform[platformIndex][resType] = images[platform][resType].images.map(createImageElement(platform, resType));
  });

  return configContents;
}

/**
 * Update splashscreen preferences within the provided Json structure of Config.xml
 */
export function addSplashScreenPreferencesToConfigJson(configJson: any): any {
  let configContents = JSON.parse(JSON.stringify(configJson));

  let hasSplashScreen = false;
  let hasSplashScreenDelay = false;

  // Check for splash screen stuff
  // <preference name="SplashScreen" value="screen"/>
  // <preference name="SplashScreenDelay" value="3000"/>
  if (!configContents.widget.preference) {
    configContents.widget.preference = [];
  }

  configContents.widget.preference.forEach(function(pref: any) {
    if (pref.$.name === 'SplashScreen') {
      hasSplashScreen = true;
    }
    if (pref.$.name === 'SplashScreenDelay') {
      hasSplashScreenDelay = true;
    }
  });

  if (!hasSplashScreen) {
    configContents.widget.preference.push({
      $: {
        name: 'SplashScreen',
        value: 'screen'
      }
    });
  }
  if (!hasSplashScreenDelay) {
    configContents.widget.preference.push({
      $: {
        name: 'SplashScreenDelay',
        value: '3000'
      }
    });
  }
  return configContents;
}

/**
 * Read the project's config.xml and convert it to Json.
 */
export async function parseConfigXmlToJson(projectDir: string): Promise<any> {
  const configFilePath = path.join(projectDir, 'config.xml');
  let configJson: any = null;
  const xml2js = load('xml2js');
  const parseString = promisify<any, string>(xml2js.parseString);

  try {
    let configFileContents = await fsReadFile(configFilePath, { encoding: 'utf8' });
    configJson = await parseString(configFileContents);
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`Cordova config.xml file was not found in ${projectDir}`);
    }
    throw e;
  }

  if (!configJson.widget) {
    throw new Error('\nYour config.xml file is invalid. You must have a <widget> element.');
  }
  return configJson;
}

/**
 * Convert provided Json to XML and write to the project's config.xml file.
 */
export async function writeConfigXml(projectDir: string, configJson: any) {
  const xml2js = load('xml2js');
  const builder = new xml2js.Builder({ renderOpts: { pretty: true, indent: '    ', } });
  const xml = builder.buildObject(configJson);
  const configFilePath = path.join(projectDir, 'config.xml');

  await fsWriteFile(configFilePath, xml, { encoding: 'utf8' });
}

/**
 * Update config.xml content src to be a dev server url. As part of this
 * backup the original content src for a reset to occur at a later time.
 */
export async function writeConfigXmlContentSrc(projectDir: string, devServerUrl: string) {
  const configJson = await parseConfigXmlToJson(projectDir);

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
      configJson.widget['allow-navigation'] = [allowNavNode];
    } else {
      var foundAllowNav = false;
      for (var i = 0; i < allowNavigation.length; i++) {
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
export async function resetConfigXmlContentSrc(projectDir: string) {
  const configJson = await parseConfigXmlToJson(projectDir);

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
