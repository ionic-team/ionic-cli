import * as path from 'path';
import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  CommandPreRun,
  promptToLogin,
} from '@ionic/cli-utils';

import {
  ImageResource,
  SourceImage,
  ResourcesConfig,
  ResourcesImageConfig,
  KnownPlatform,
  ImageUploadResponse
} from '../definitions';
import { getProjectPlatforms, installPlatform } from '../lib/utils/setup';
import { getOrientationFromConfigJson, parseConfigXmlToJson } from '../lib/utils/configXmlUtils';
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

/*
const RESOURCES_SUMMARY =
`Automatically create icon and splash screen resources.
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2732x2732 px, with the image centered in the middle.
`;
*/

const AVAILABLE_RESOURCE_TYPES = ['icon', 'splash'];

@CommandMetadata({
  name: 'resources',
  type: 'project',
  description: 'Automatically create icon and splash screen resources',
  exampleCommands: [''],
  inputs: [
    {
      name: 'platform',
      description: `The platform for which you would like to generate resources (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
      required: false,
    }
  ],
  options: [
    {
      name: 'icon',
      description: 'Generate icon resources',
      type: Boolean,
      aliases: ['i'],
    },
    {
      name: 'splash',
      description: 'Generate splash screen resources',
      type: Boolean,
      aliases: ['s'],
    }
  ]
})
export class ResourcesCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const isLoggedIn = await this.env.session.isLoggedIn();
    if (!isLoggedIn) {
      this.env.log.warn(`You need to be logged into your Ionic account in order to run ${chalk.green(`ionic cordova resources`)}.\n`);
      await promptToLogin(this.env);
    }
  }

  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;

    // if no resource filters are passed as arguments assume to use all.
    let resourceTypes = AVAILABLE_RESOURCE_TYPES.filter((type, index, array) => options[type]);
    resourceTypes = (resourceTypes.length) ? resourceTypes : AVAILABLE_RESOURCE_TYPES;

    const resourceDir = path.join(this.env.project.directory, 'resources'); // TODO: hard-coded

    this.env.tasks.next(`Collecting resource configuration and source images`);

    // check that config file config.xml exists
    const configJson = await parseConfigXmlToJson(this.env.project.directory);

    const config = await this.env.config.load();

    const resourceJsonStructure = await getResourceConfigJson();
    this.env.log.debug(`resourceJsonStructure=${Object.keys(resourceJsonStructure).length}`);

    // check that at least one platform has been installed
    let platformDirContents = await getProjectPlatforms(this.env.project.directory);
    this.env.log.debug(`platformDirContents=${platformDirContents}`);

    if (platform && !platformDirContents.includes(platform)) {
      this.env.tasks.end();
      const confirm = await this.env.prompt({
        message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
        type: 'confirm',
        name: 'confirm',
      });

      if (confirm) {
        await installPlatform(this.env, platform);
        platformDirContents = await getProjectPlatforms(this.env.project.directory);
        this.env.log.debug(`platformDirContents=${platformDirContents}`);
      } else {
        throw this.exit(`Platform ${chalk.green(platform)} not installed.`);
      }
    }

    const buildPlatforms = Object.keys(resourceJsonStructure).filter(p => platformDirContents.includes(p));
    this.env.log.debug(`buildPlatforms=${buildPlatforms}`);
    if (buildPlatforms.length === 0) {
      this.env.tasks.end();
      throw this.exit(`No platforms have been added. Please run: ${chalk.green('ionic cordova platform add')}`);
    }
    this.env.log.debug(`${chalk.green('getProjectPlatforms')} completed - length=${buildPlatforms.length}`);

    const orientation = getOrientationFromConfigJson(configJson) || 'default';

    // Convert the resource structure to a flat array then filter the array so
    // that it only has img resources that we need. Finally add src path to the
    // items that remain.
    let imgResources: ImageResource[] = flattenResourceJsonStructure(resourceJsonStructure)
      .filter((img) => orientation === 'default' || typeof img.orientation === 'undefined' || img.orientation === orientation)
      .filter((img) => buildPlatforms.includes(img.platform))
      .filter((img) => resourceTypes.includes(img.resType))
      .map((img) => ({
        ...img,
        dest: path.join(resourceDir, img.platform, img.resType, img.name)
      }));

    if (platform) {
      imgResources = imgResources.filter((img) => img.platform === platform);
    }

    this.env.log.debug(`imgResources=${imgResources.length}`);

    // Create the resource directories that are needed for the images we will create
    const buildDirResponses = await createImgDestinationDirectories(imgResources);
    this.env.log.debug(`${chalk.green('createImgDestinationDirectories')} completed - length=${buildDirResponses.length}`);

    // Check /resources and /resources/<platform> directories for src files
    // Update imgResources to have their src attributes to equal the most
    // specific src img found
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

    // If there are any imgResources that have missing images then end
    // processing and inform the user
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

    this.env.tasks.next(`Uploading source images to prepare for transformations`);

    // Upload images to service to prepare for resource transformations
    let imageUploadResponses: ImageUploadResponse[];
    const timeout = config.cliFlags.timeout ? 25000 : 0;
    imageUploadResponses = await uploadSourceImages(srcImagesAvailable, timeout);
    this.env.log.debug(`${chalk.green('uploadSourceImages')} completed - responses=${JSON.stringify(imageUploadResponses, null, 2)}`);

    srcImagesAvailable = srcImagesAvailable.map((img: SourceImage, index): SourceImage => {
      return {
        ...img,
        width: imageUploadResponses[index].Width,
        height: imageUploadResponses[index].Height,
        vector: imageUploadResponses[index].Vector
      };
    });

    // If any images are asking to be generated but are not of the correct size
    // inform the user and continue on.
    const imagesTooLargeForSource = imgResources.filter((imageResource: ImageResource) => {
      const resourceSourceImage = srcImagesAvailable.find(srcImage => srcImage.imageId === imageResource.imageId);
      if (resourceSourceImage === undefined) {
        return true;
      }

      return !resourceSourceImage.vector &&
        (imageResource.width > resourceSourceImage.width || imageResource.height > resourceSourceImage.height);
    });

    // Remove all images too large for transformations
    imgResources = imgResources.filter(imageResource => {
      return !imagesTooLargeForSource.find(tooLargeForSourceImage => imageResource.name === tooLargeForSourceImage.name);
    });

    // Call the transform service and output images to appropriate destination
    this.env.tasks.next(`Generating platform resources`);
    let count = 0;

    const promiseList = imgResources.map(async (img, index): Promise<void> => {
      await transformResourceImage(img, timeout);
      count += 1;
      this.env.tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${count} / ${imgResources.length}`)} complete`);
    });

    const generateImageResponses = await Promise.all(promiseList);
    this.env.tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${imgResources.length} / ${imgResources.length}`)} complete`);
    this.env.log.debug(`${chalk.green('generateResourceImage')} completed - responses=${JSON.stringify(generateImageResponses, null, 2)}`);

    // TODO: UPDATE CONFIG.XML DATA
    this.env.tasks.next(`Modifying config.xml to add new image resources`);
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

    await addResourcesToConfigXml(this.env.project.directory, platformList, imageResourcesForConfig);

    this.env.tasks.end();

    // All images that were not processed
    if (imagesTooLargeForSource.length > 0) {
      const imagesTooLargeForSourceMsg = imagesTooLargeForSource
        .map(imageResource => `    ${chalk.bold(imageResource.name)}     ${imageResource.platform}/${imageResource.resType} needed ${imageResource.width}w x ${imageResource.height}h`)
        .concat((imagesTooLargeForSource.length > 0) ? `\nThe following images were not created because their source image was too small:` : [])
        .reverse();

      this.env.log.info(imagesTooLargeForSourceMsg.join('\n'));
    }
  }
}
