import * as path from 'path';
import * as chalk from 'chalk';
import {
  fsReadFile, fsReadJsonFile, CommandLineInputs,
  CommandLineOptions, Command, CommandMetadata
} from '@ionic/cli-utils';

import { ImageResource, SourceImage } from '../definitions';
import { getOrientationConfigData } from '../lib/configXmlUtils';
import {
  flattenResourceJsonStructure,
  getProjectPlatforms,
  createImgDestinationDirectories,
  getSourceImages,
  findMostSpecificImage
} from '../lib/resources';


const RESOURCES_SUMMARY = `
Automatically create icon and splash screen resources
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2208x2208 px, with the image centered in the middle.
`;


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

    /**
     * check that config file config.xml exists
     */
    try {
      configFileContents = await fsReadFile(configFilePath, { encoding: 'utf8' });
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error(`${chalk.bold(configFilePath)} does not appear to exist. Please ensure that this is a \n`
                         + `cordova project.`);
      }
      throw e;
    }

    /**
     * check that at least one platform has been installed
     */
    const resourceJsonStructure = await fsReadJsonFile('../lib/resources.json');
    const platformsDir = path.join(this.env.project.directory, 'platforms');

    const buildPlatforms = await getProjectPlatforms(resourceJsonStructure, platformsDir);
    if (buildPlatforms.length === 0) {
      throw new Error('No platforms have been added');
    }

    /**
     * Convert the resource structure to a flat array then filter the array
     * so that it only has img resources that we need. Finally add src path to the
     * items that remain.
     */
    let imgResources: ImageResource[] = flattenResourceJsonStructure(resourceJsonStructure)
      .filter((img: ImageResource) => buildPlatforms.indexOf(img.platform) !== -1)
      .filter((img: ImageResource) => resourceTypes.indexOf(img.resType) !== -1)
      .map((img: ImageResource) => ({
        ...img,
        dest: path.join(resourceDir, img.platform, img.resType, img.name)
      }));

    /**
     * Create the resource directories that are needed for the images we will create
     */
    await createImgDestinationDirectories(imgResources);

    /**
     * Get orientation config data
     */
    const orientation = getOrientationConfigData(configFileContents);

    /**
     * Check /resources and /resources/<platform> directories for src files
     * Update imgResources to have their src attributes to equal the most speficic src img found
     */
    const srcImagesAvailable: SourceImage[] = await getSourceImages(buildPlatforms, resourceTypes, resourceDir);
    imgResources = imgResources.map((imageResource: ImageResource) => {
      const mostSpecificImageAvailable = findMostSpecificImage(imageResource, srcImagesAvailable);
      return {
        ...imageResource,
        src: mostSpecificImageAvailable ? mostSpecificImageAvailable.path : null
     };
    });

    /**
     * If there are any imgResources that have missing images then end processing and inform the user
     */
    const missingSrcImages = imgResources.filter((imageResource: ImageResource) => imageResource.src === null);
    if (missingSrcImages.length > 0) {
      const missingImageText = missingSrcImages
        .reduce((list: any[], img: ImageResource): any => {
          let str = `${img.resType}/${img.platform}`;
          if (list.indexOf(str) !== -1) {
            list.push(str);
          }
          return list;
        }, [])
        .reduce((txt: string, imgText: string) => `${txt}, ${imgText}.`, '');

      throw new Error(`Source image files were not found for the following platforms/types: ${missingImageText}`);
    }



    // loadSourceImages
    // generateResourceImages
    // loadResourceImages
    // updateCOnfigData

    this.env.log.msg(`${configFileContents} ${resourceDirContents} ${orientation}`);
  }
}
