import * as path from 'path';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  FatalException,
  pathExists,
  promptToLogin,
} from '@ionic/cli-utils';

import {
  KnownPlatform,
  ResourcesConfig,
  ResourcesImageConfig,
  SourceImage,
} from '../definitions';

import {
  RESOURCES,
  addResourcesToConfigXml,
  createImgDestinationDirectories,
  findMostSpecificImage,
  flattenResourceJsonStructure,
  getSourceImages,
  transformResourceImage,
  uploadSourceImages,
} from '../lib/resources';

import { ConfigXml } from '../lib/utils/configXml';
import { getProjectPlatforms, installPlatform } from '../lib/utils/setup';

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
  name: 'cordova resources',
  type: 'project',
  description: 'Automatically create icon and splash screen resources',
  longDescription: `
Ionic can automatically generate perfectly sized icons and splash screens from source images (${chalk.bold('.png')}, ${chalk.bold('.psd')}, or ${chalk.bold('.ai')}) for your Cordova platforms.

The source image for icons should ideally be at least ${chalk.bold('1024×1024px')} and located at ${chalk.bold('resources/icon.png')}. The source image for splash screens should ideally be at least ${chalk.bold('2732×2732px')} and located at ${chalk.bold('resources/splash.png')}. If you used ${chalk.green('ionic start')}, there should already be default Ionic resources in the ${chalk.bold('resources/')} directory, which you can overwrite.

You can also generate platform-specific icons and splash screens by placing them in the respective ${chalk.bold('resources/<platform>/')} directory. For example, to generate an icon for Android, place your image at ${chalk.bold('resources/android/icon.png')}.

By default, this command will not regenerate resources whose source image has not changed. To disable this functionality and always overwrite generated images, use ${chalk.green('--force')}.

For best results, the splash screen's artwork should roughly fit within a square (${chalk.bold('1200×1200px')}) at the center of the image. You can use ${chalk.bold('https://code.ionicframework.com/resources/splash.psd')} as a template for your splash screen.

${chalk.green('ionic cordova resources')} will automatically update your ${chalk.bold('config.xml')} to reflect the changes in the generated images, which Cordova then configures.

Cordova reference documentation:
- Icons: ${chalk.bold('https://cordova.apache.org/docs/en/latest/config_ref/images.html')}
- Splash Screens: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-splashscreen/')}

This command uses Ionic servers, so we require you to be logged into your free Ionic account. Use ${chalk.green('ionic login')} to login.
  `,
  exampleCommands: ['', 'ios', 'android'],
  inputs: [
    {
      name: 'platform',
      description: `The platform for which you would like to generate resources (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
      required: false,
    }
  ],
  options: [
    {
      name: 'force',
      description: 'Force regeneration of all resources',
      type: Boolean,
      aliases: ['f'],
    },
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
    },
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

  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const [ platform ] = inputs;

    const conf = await ConfigXml.load(this.env.project.directory);

    // if no resource filters are passed as arguments assume to use all.
    let resourceTypes = AVAILABLE_RESOURCE_TYPES.filter((type, index, array) => options[type]);
    resourceTypes = (resourceTypes.length) ? resourceTypes : AVAILABLE_RESOURCE_TYPES;

    const resourceDir = path.join(this.env.project.directory, 'resources'); // TODO: hard-coded

    this.env.tasks.next(`Collecting resource configuration and source images`);

    this.env.log.debug(() => `resourceJsonStructure=${Object.keys(RESOURCES).length}`);

    // check that at least one platform has been installed
    let platformDirContents = await getProjectPlatforms(this.env.project.directory);
    this.env.log.debug(() => `platformDirContents=${platformDirContents}`);

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
        this.env.log.debug(() => `platformDirContents=${platformDirContents}`);
      } else {
        throw this.exit(`Platform ${chalk.green(platform)} not installed.`);
      }
    }

    const buildPlatforms = Object.keys(RESOURCES).filter(p => platformDirContents.includes(p));
    this.env.log.debug(() => `buildPlatforms=${buildPlatforms}`);
    if (buildPlatforms.length === 0) {
      this.env.tasks.end();
      throw this.exit(`No platforms have been added. Please run: ${chalk.green('ionic cordova platform add')}`);
    }
    this.env.log.debug(() => `${chalk.green('getProjectPlatforms')} completed - length=${buildPlatforms.length}`);

    const orientation = await conf.getPreference('Orientation') || 'default';

    // Convert the resource structure to a flat array then filter the array so
    // that it only has img resources that we need. Finally add src path to the
    // items that remain.
    let imgResources = flattenResourceJsonStructure()
      .filter(img => orientation === 'default' || typeof img.orientation === 'undefined' || img.orientation === orientation)
      .filter(img => buildPlatforms.includes(img.platform))
      .filter(img => resourceTypes.includes(img.resType))
      .map(img => ({
        ...img,
        dest: path.join(resourceDir, img.platform, img.resType, img.name)
      }));

    if (platform) {
      imgResources = imgResources.filter(img => img.platform === platform);
    }

    this.env.log.debug(() => `imgResources=${imgResources.length}`);

    // Create the resource directories that are needed for the images we will create
    const buildDirResponses = await createImgDestinationDirectories(imgResources);
    this.env.log.debug(() => `${chalk.green('createImgDestinationDirectories')} completed - length=${buildDirResponses.length}`);

    // Check /resources and /resources/<platform> directories for src files
    // Update imgResources to have their src attributes to equal the most
    // specific src img found
    let srcImagesAvailable: SourceImage[] = [];

    try {
      srcImagesAvailable = await getSourceImages(buildPlatforms, resourceTypes, resourceDir);
      this.env.log.debug(() => `${chalk.green('getSourceImages')} completed - ${srcImagesAvailable.length}`);
    } catch (e) {
      this.env.log.error(`Error in ${chalk.green('getSourceImages')}: ${e.stack ? e.stack : e}`);
    }

    imgResources = imgResources.map(img => {
      const mostSpecificImageAvailable = findMostSpecificImage(img, srcImagesAvailable);
      return {
        ...img,
        imageId: mostSpecificImageAvailable && mostSpecificImageAvailable.imageId ? mostSpecificImageAvailable.imageId : null,
      };
    });

    // If there are any imgResources that have missing images then end
    // processing and inform the user
    const missingSrcImages = imgResources.filter(img => img.imageId === null);
    if (missingSrcImages.length > 0) {
      const missingImageText = missingSrcImages
        .reduce((list, img) => {
          const str = `${img.platform}/${img.resType}`;
          if (!list.includes(str)) {
            list.push(str);
          }
          return list;
        }, <string[]>[])
        .map(v => chalk.bold(v))
        .join(', ');

      throw new FatalException(
        `Source image files were not found for the following platforms/types: ${missingImageText}\n\n` +
        `Please review ${chalk.green('--help')}`
      );
    }

    this.env.tasks.next(`Filtering out image resources that do not need regeneration`);

    const cachedSourceIds = srcImagesAvailable
      .filter(img => img.imageId && img.cachedId && img.imageId === img.cachedId)
      .map(img => img.imageId);

    const keepImgResources = await Promise.all(imgResources.map(async (img) => {
      if (!await pathExists(img.dest)) {
        return true;
      }

      return img.imageId && !cachedSourceIds.includes(img.imageId);
    }));

    imgResources = imgResources.filter((img, i) => keepImgResources[i]);

    if (imgResources.length === 0) {
      this.env.tasks.end();
      this.env.log.ok('No need to regenerate images--source files unchanged.');
      return 0;
    }

    this.env.tasks.next(`Uploading source images to prepare for transformations`);

    // Upload images to service to prepare for resource transformations
    const imageUploadResponses = await uploadSourceImages(srcImagesAvailable);
    this.env.log.debug(() => `${chalk.green('uploadSourceImages')} completed - responses=${JSON.stringify(imageUploadResponses, null, 2)}`);

    srcImagesAvailable = srcImagesAvailable.map((img, index) => {
      return {
        ...img,
        width: imageUploadResponses[index].Width,
        height: imageUploadResponses[index].Height,
        vector: imageUploadResponses[index].Vector
      };
    });

    // If any images are asking to be generated but are not of the correct size
    // inform the user and continue on.
    const imagesTooLargeForSource = imgResources.filter(img => {
      const resourceSourceImage = srcImagesAvailable.find(srcImage => srcImage.imageId === img.imageId);
      if (!resourceSourceImage) {
        return true;
      }

      return !resourceSourceImage.vector && (img.width > resourceSourceImage.width || img.height > resourceSourceImage.height);
    });

    // Remove all images too large for transformations
    imgResources = imgResources.filter(img => {
      return !imagesTooLargeForSource.find(tooLargeForSourceImage => img.name === tooLargeForSourceImage.name);
    });

    if (imgResources.length === 0) {
      this.env.tasks.end();
      this.env.log.ok('No need to regenerate images--source files unchanged.');
      return 0;
    }

    // Call the transform service and output images to appropriate destination
    this.env.tasks.next(`Generating platform resources`);
    let count = 0;

    const transforms = imgResources.map(async (img, index) => {
      await transformResourceImage(img);
      count += 1;
      this.env.tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${count} / ${imgResources.length}`)} complete`);
    });

    const generateImageResponses = await Promise.all(transforms);
    this.env.tasks.updateMsg(`Generating platform resources: ${chalk.bold(`${imgResources.length} / ${imgResources.length}`)} complete`);
    this.env.log.debug(() => `${chalk.green('generateResourceImage')} completed - responses=${JSON.stringify(generateImageResponses, null, 2)}`);

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

    const platformList = <KnownPlatform[]>Object.keys(imageResourcesForConfig);
    await addResourcesToConfigXml(conf, platformList, imageResourcesForConfig);

    this.env.tasks.end();

    // All images that were not processed
    if (imagesTooLargeForSource.length > 0) {
      const imagesTooLargeForSourceMsg = imagesTooLargeForSource
        .map(img => `    ${chalk.bold(img.name)}     ${img.platform}/${img.resType} needed ${img.width}×${img.height}px`)
        .concat((imagesTooLargeForSource.length > 0) ? `\nThe following images were not created because their source image was too small:` : [])
        .reverse();

      this.env.log.info(imagesTooLargeForSourceMsg.join('\n'));
    }

    await conf.save();
  }
}
