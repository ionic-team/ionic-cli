import * as path from 'path';
import * as chalk from 'chalk';
import {
  ERROR_FILE_NOT_FOUND, ERROR_FILE_INVALID_JSON,
  fsReadJsonFile, CommandLineInputs,
  CommandLineOptions, Command, CommandMetadata
} from '@ionic/cli-utils';

import { ImageResource, SourceImage  } from '../definitions';
import { parseConfigXml } from '../lib/configXmlUtils';
import {
  flattenResourceJsonStructure,
  getProjectPlatforms,
  createImgDestinationDirectories,
  getSourceImages,
  findMostSpecificImage,
  uploadSourceImages,
  generateResourceImage
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

    let configFileContents: string;

    /**
     * check that config file config.xml exists
     */
    try {
      configFileContents = await parseConfigXml(this.env.project.directory);
    } catch (e) {
      throw e;
    }

    let resourceJsonStructure;
    const filePath = path.join(__dirname, '..', '..', 'resources.json');
    try {
      resourceJsonStructure = await fsReadJsonFile(filePath);
    } catch (e) {
      if (e === ERROR_FILE_NOT_FOUND) {
        throw new Error(`${filePath} not found`);
      } else if (e === ERROR_FILE_INVALID_JSON) {
        throw new Error(`${filePath} is not valid JSON.`);
      }
      throw e;
    }

    /**
     * check that at least one platform has been installed
     */
    const buildPlatforms = await getProjectPlatforms(resourceJsonStructure, resourceDir);
    if (buildPlatforms.length === 0) {
      throw new Error(`No platforms have been added. '${chalk.red(resourceDir)}'`);
    }
    this.env.log.debug(`${chalk.green('getProjectPlatforms')} completed`);

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
    this.env.log.debug(`${chalk.green('createImgDestinationDirectories')} completed`);


    /**
     * Check /resources and /resources/<platform> directories for src files
     * Update imgResources to have their src attributes to equal the most speficic src img found
     */
    let srcImagesAvailable: SourceImage[] = await getSourceImages(buildPlatforms, resourceTypes, resourceDir);
    this.env.log.debug(`${chalk.green('getSourceImages')} completed`);

    imgResources = imgResources.map((imageResource: ImageResource): ImageResource => {
      const mostSpecificImageAvailable = findMostSpecificImage(imageResource, srcImagesAvailable);
      return {
        ...imageResource,
        imageId: mostSpecificImageAvailable ? mostSpecificImageAvailable.imageId : null,
     };
    });

    /**
     * If there are any imgResources that have missing images then end processing and inform the user
     */
    const missingSrcImages = imgResources.filter((imageResource: ImageResource) => imageResource.imageId === null);
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

    /**
     * Upload images to service to prepare for resource transformations
     */
    const imageUploadResponses = await uploadSourceImages(srcImagesAvailable);
    this.env.log.debug(`${chalk.green('uploadSourceImages')} completed`);

    srcImagesAvailable = srcImagesAvailable.map((img, index) => {
      return {
        ...img,
        width: imageUploadResponses[index].Width,
        height: imageUploadResponses[index].Height,
        vector: imageUploadResponses[index].Vector
      };
    });

    /**
     * Call the transform service and output images to appropriate destination
     */
    Promise.all(
      imgResources.map(img => generateResourceImage(img))
    );
  }
}
