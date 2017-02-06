import * as path from 'path';
import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain
} from '@ionic/cli-utils';

import {
  ImageResource,
  SourceImage,
  ResourcesConfig,
  ResourcesImageConfig,
  KnownPlatform,
  ImageUploadResponse
} from '../definitions';
import { getProjectPlatforms } from '../lib/utils/setup';
import { parseConfigXmlToJson } from '../lib/utils/configXmlUtils';
import {
  flattenResourceJsonStructure,
  createImgDestinationDirectories,
  getSourceImages,
  findMostSpecificImage,
  uploadSourceImages,
  transformResourceImage,
  getResourceConfigJson,
  addResourcesToConfigXml
} from '../lib/resources';


const RESOURCES_SUMMARY = `
Automatically create icon and splash screen resources.
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2208x2208 px, with the image centered in the middle.
`;

const AVAILABLE_RESOURCE_TYPES = ['icon', 'splash'];

@CommandMetadata({
  name: 'resources',
  description: RESOURCES_SUMMARY,
  exampleCommands: [''],
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

    // if no resource filters are passed as arguments assume to use all.
    let resourceTypes = AVAILABLE_RESOURCE_TYPES.filter((type, index, array) => options[type]);
    resourceTypes = (resourceTypes.length) ? resourceTypes : AVAILABLE_RESOURCE_TYPES;

    const resourceDir = path.join(this.env.project.directory, 'resources');

    let configFileContents: string;

    var tasks = new TaskChain();
    tasks.next(`Collecting resource configuration and source images`);

    /**
     * check that config file config.xml exists
     */
    try {
      configFileContents = await parseConfigXmlToJson(this.env.project.directory);
    } catch (e) {
      throw e;
    }

    const resourceJsonStructure = await getResourceConfigJson();
    this.env.log.debug(`resourceJsonStructure=${Object.keys(resourceJsonStructure).length}`);

    /**
     * check that at least one platform has been installed
     */
    const platformDirContents = await getProjectPlatforms(this.env.project.directory);
    const buildPlatforms = Object.keys(resourceJsonStructure)
      .filter(platform => platformDirContents.includes(platform));
    if (buildPlatforms.length === 0) {
      throw new Error(`No platforms have been added. '${chalk.red(resourceDir)}'`);
    }
    this.env.log.debug(`${chalk.green('getProjectPlatforms')} completed - length=${buildPlatforms.length}`);

    /**
     * Convert the resource structure to a flat array then filter the array
     * so that it only has img resources that we need. Finally add src path to the
     * items that remain.
     */
    let imgResources: ImageResource[] = flattenResourceJsonStructure(resourceJsonStructure)
      .filter((img: ImageResource) => buildPlatforms.includes(img.platform))
      .filter((img: ImageResource) => resourceTypes.includes(img.resType))
      .map((img: ImageResource) => ({
        ...img,
        dest: path.join(resourceDir, img.platform, img.resType, img.name)
      }));
    this.env.log.debug(`imgResources=${imgResources.length}`);

    /**
     * Create the resource directories that are needed for the images we will create
     */
    try {
      const buildDirResponses = await createImgDestinationDirectories(imgResources);
      this.env.log.debug(`${chalk.green('createImgDestinationDirectories')} completed - length=${buildDirResponses.length}`);
    } catch (e) {
      throw e;
    }

    /**
     * Check /resources and /resources/<platform> directories for src files
     * Update imgResources to have their src attributes to equal the most speficic src img found
     */
    let srcImagesAvailable: SourceImage[] = [];
    try {
      srcImagesAvailable = await getSourceImages(buildPlatforms, resourceTypes, resourceDir);
      this.env.log.debug(`${chalk.green('getSourceImages')} completed - ${srcImagesAvailable.length}`);
    } catch (e) {

    }

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
          if (list.includes(str)) {
            list.push(str);
          }
          return list;
        }, [])
        .join('\n');

      throw new Error(`Source image files were not found for the following platforms/types: \n${missingImageText}`);
    }



    tasks.next(`Uploading source images to prepare for transformations`);

    /**
     * Upload images to service to prepare for resource transformations
     */
    let imageUploadResponses: ImageUploadResponse[];
    try {
      imageUploadResponses = await uploadSourceImages(srcImagesAvailable);
      this.env.log.debug(`${chalk.green('uploadSourceImages')} completed - responses=${JSON.stringify(imageUploadResponses, null, 2)}`);
    } catch (e) {
      throw e;
    }

    srcImagesAvailable = srcImagesAvailable.map((img: SourceImage, index): SourceImage => {
      return {
        ...img,
        width: imageUploadResponses[index].Width,
        height: imageUploadResponses[index].Height,
        vector: imageUploadResponses[index].Vector
      };
    });

    /**
     * If any images are asking to be generated but are not of the correct size inform the user and continue on.
     */
    const imagesTooLargeForSource = imgResources.filter((imageResource: ImageResource) => {
      const resourceSourceImage = srcImagesAvailable.find(srcImage => srcImage.imageId === imageResource.imageId);
      if (resourceSourceImage === undefined) {
        return true;
      }

      return !resourceSourceImage.vector &&
        (imageResource.width > resourceSourceImage.width || imageResource.height > resourceSourceImage.height);
    });

    /**
     * Remove all images too large for transformations
     */
    imgResources = imgResources.filter(imageResource => {
      return !imagesTooLargeForSource.find(tooLargeForSourceImage => imageResource.name === tooLargeForSourceImage.name);
    });

    /**
     * Call the transform service and output images to appropriate destination
     */
    tasks.next(`Generating platform resources`);
    let count = 0;

    const promiseList = imgResources.map((img, index): Promise<void> => {
      return transformResourceImage(img).then(() => {
        count += 1;
        tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${count} / ${imgResources.length}`)} complete`);
      });
    });

    try {
      const generateImageResponses = await Promise.all(promiseList);
      tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${imgResources.length} / ${imgResources.length}`)} complete`);
      this.env.log.debug(`${chalk.green('generateResourceImage')} completed - responses=${JSON.stringify(generateImageResponses, null, 2)}`);
    } catch (e) {
      throw e;
    }


    // TODO: UPDATE CONFIG.XML DATA
    tasks.next(`Modify config.xml to add new image resources`);
    const imageResourcesForConfig = imgResources.reduce((rc, img) => {
      if (!rc[img.platform]) {
        rc[img.platform] = {
          [img.resType]: {
            images: [],
            nodeName: '',
            nodeAttributes: []
          }
        };
      }
      if (!rc[img.platform][img.resType]) {
        rc[img.platform][img.resType] = {
          images: [],
          nodeName: '',
          nodeAttributes: []
        };
      }
      rc[img.platform][img.resType].images.push(<ResourcesImageConfig>{
        name: img.name,
        width: img.width,
        height: img.height,
        density: img.density || null
      });
      rc[img.platform][img.resType].nodeName = img.nodeName;
      rc[img.platform][img.resType].nodeAttributes = img.nodeAttributes;

      return rc;
    }, <ResourcesConfig>{});

    const platformList: KnownPlatform[] = Object
      .keys(imageResourcesForConfig)
      .map(pn => <KnownPlatform>pn);

    try {
      await addResourcesToConfigXml(this.env.project.directory, platformList, imageResourcesForConfig);
    } catch (e) {
      throw e;
    }

    tasks.end();
    /**
     * Print out all images that were not processed
     */
    this.env.log.msg(
      imagesTooLargeForSource.map(imageResource => (
        `    ${chalk.bold(imageResource.name)}     ${imageResource.platform}/${imageResource.resType} needed ${imageResource.width}w x ${imageResource.height}h`
      ))
      .concat((imagesTooLargeForSource.length > 0) ? `\nThe following images were not created because their source image was too small:` : [])
      .reverse()
      .join('\n')
    );
  }
}
