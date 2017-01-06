import {
  fsReadFile, fsReadDir, fsMkdirp, fsReadJsonFile, prettyPath, CommandLineInputs,
  CommandLineOptions, Command, CommandMetadata
} from '@ionic/cli-utils';

import { getOrientationConfigData } from '../lib/configXmlUtils';

import * as path from 'path';
import * as chalk from 'chalk';

const SUPPORTED_SOURCE_EXTENSIONS = ['psd', 'ai', 'png'];
const RESOURCES_SUMMARY = `
Automatically create icon and splash screen resources
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2208x2208 px, with the image centered in the middle.
`;


interface ImageResource {
  name: string;
  width: number;
  height: number;
  density: string;
  platform: string;
  resType: string;
  src: string;
  nodeName: string;
  nodeAttributes: string[];
}

/*
const SETTINGS = {
  apiUrl: 'http://res.ionic.io',
  apiUploadPath: '/api/v1/upload',
  apiTransformPath: '/api/v1/transform',
  generateThrottle: 4,
  defaultMaxIconSize: 96,
  cacheImages: false
};
*/

@CommandMetadata({
  name: 'resources',
  description: RESOURCES_SUMMARY,
  options: [
    {
      name: 'icon',
      description: 'Generate icon resources',
      type: Boolean,
      aliases: ['i']
    },
    {
      name: 'splash',
      description: 'Generate splash screen resources',
      type: Boolean,
      aliases: ['s']
    }
  ]
})
export class ResourcesCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const resourceTypes = ['icon', 'splash'].filter(type => options[type]);
    const resourceDir = path.join(this.env.project.directory, 'resources');
    const configFilePath = path.join(this.env.project.directory, 'config.xml');

    let configFileContents: string;
    let resourceDirContents: string[] = [];
    let platformDirContents: string[] = [];

    /**
     * check that config file config.xml exists
     */
    try {
      configFileContents = await fsReadFile(configFilePath, { encoding: 'utf8' });
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.env.log.error(`${chalk.bold(configFilePath)} does not appear to exist. Please ensure that this is a \n`
                         + `cordova project.`);
        return;
      }
      throw e;
    }


    /**
     * check that at least one platform has been installed
     * TODO: should we get this from the config.xml or just the directories like app-lib
     */
    try {
      platformDirContents = await fsReadDir(path.join(this.env.project.directory, 'platforms'));
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.env.log.error('No platforms have been added.');
        return;
      }
      throw e;
    }

    const resourceJsonStructure = await fsReadJsonFile('../lib/resources.json');
    const buildPlatforms = Object.keys(resourceJsonStructure).filter(platform => platformDirContents.indexOf(platform) !== -1);
    if (buildPlatforms.length === 0) {
      this.env.log.error('No platforms have been added');
    }

    /**
     * Convert the resource structure to a flat array then filter the array
     * so that it only has img resources that we need. Finally add src path to the
     * items that remain.
     */
    const imgResources: ImageResource[] = flattenResourceJsonStructure(resourceJsonStructure)
      .filter((img: ImageResource) => buildPlatforms.indexOf(img.platform) !== -1)
      .filter((img: ImageResource) => resourceTypes.indexOf(img.resType) !== -1)
      .map((img: ImageResource) => ({
        ...img,
        src: path.join(resourceDir, img.platform, img.resType, img.name)
      }));

    // setup list of source images that will be needed
    const srcImageSettings = [].concat.apply(buildPlatforms.map(platform => (
      resourceTypes.map(resType => (
        {
          resType,
          platform,
          path: null
        }
      ))
    )));

    /**
     * Create the resource directories that are needed for the images we will create
     */
    const buildDirPromises: Promise<void>[] = imgResources
      .map(img => path.dirname(img.src))
      .filter((dir, index, dirNames) => dirNames.indexOf(dir) === index)
      .map(dir => fsMkdirp(dir));

    await Promise.all(buildDirPromises);

    /**
     * Get orientation config data
     */
    const orientation = getOrientationConfigData(configFileContents);

    /**
     * Check /resources and /resources/<platform> directories for src files
     */
    const srcDirList = buildPlatforms
      .map(platform => (
        {
          platform,
          path: path.join(resourceDir, platform)
        }
      ))
      .concat({
        platform: 'global',
        path: resourceDir
      });
    const srcImageDirListPromises = srcDirList.map(srcImgDir => fsReadDir(srcImgDir.path));

    const srcImageDirContentList = await Promise.all(srcImageDirListPromises);
    const srcImagesAvailable = [].concat.apply(
      srcImageDirContentList.map((srcImageDirContents, index) => (
        srcImageDirContents
          .map(imgName => {
            const ext = path.extname(imgName);

            return {
              ext,
              platform: srcDirList[index].platform,
              resType: path.basename(imgName, ext),
              path: path.join(srcDirList[index].path, imgName),
            };
          })
          .filter(img => SUPPORTED_SOURCE_EXTENSIONS.indexOf(img.ext) !== -1)
          .filter(img => resourceTypes.indexOf(img.resType) !== -1)
      ))
    );

    srcImageSettings.map((sis: any) => {
      srcImagesAvailable.filter((sia: any) => sia.platform === sis.platform && sia.resType === sis.resType);
      return {
        ...sis,
        path:
      };
    });

    // loadSourceImages
    // generateResourceImages
    // loadResourceImages
    // updateCOnfigData

    this.env.log.msg(`${configFileContents} ${resourceDirContents} ${orientation}`);
  }
}


/**
 * Take the JSON structure for resources.json and turn it into a flat array
 * that contains only images and turns all struture info into attributes of the image
 * items.
 */
function flattenResourceJsonStructure (jsonStructure: any): ImageResource[] {
  return [].concat.apply(Object.keys(jsonStructure).map(platform => (
    Object.keys(jsonStructure[platform]).map(resType => (
      jsonStructure[platform][resType]['images'].map((imgInfo: any) => (
        {
          platform,
          resType,
          name: imgInfo.name,
          width: imgInfo.width,
          height: imgInfo.height,
          density: imgInfo.density,
          nodeName: jsonStructure[platform][resType]['nodeName'],
          nodeAttributes: jsonStructure[platform][resType]['nodeAttributes']
        }
      ))
    ))
  )));
}
