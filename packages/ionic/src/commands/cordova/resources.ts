import { ERROR_SHELL_COMMAND_NOT_FOUND, LOGGER_LEVELS, OptionGroup, ShellCommandError, createPrefixedFormatter } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { cacheFileChecksum, copy, pathExists } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, KnownPlatform, ResourcesConfig, ResourcesImageConfig, SourceImage } from '../../definitions';
import { FatalException } from '../../lib/errors';
import { createDefaultLoggerHandlers } from '../../lib/utils/logger';
import { pkgManagerArgs } from '../../lib/utils/npm';

import { CordovaCommand } from './base';

const debug = Debug('ionic:commands:cordova:resources');

const AVAILABLE_RESOURCE_TYPES = ['icon', 'splash'];

export class ResourcesCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'resources',
      type: 'project',
      summary: 'Automatically create icon and splash screen resources',
      description: `
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
          summary: `The platform for which you would like to generate resources (${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options: [
        {
          name: 'force',
          summary: 'Force regeneration of resources',
          type: Boolean,
          aliases: ['f'],
        },
        {
          name: 'icon',
          summary: 'Generate icon resources',
          type: Boolean,
          aliases: ['i'],
        },
        {
          name: 'splash',
          summary: 'Generate splash screen resources',
          type: Boolean,
          aliases: ['s'],
        },
        {
          name: 'cordova-res',
          summary: `Use ${chalk.green('cordova-res')} instead of Ionic resource server`,
          type: Boolean,
          groups: [OptionGroup.Hidden],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    const { promptToLogin } = await import('../../lib/session');

    const isLoggedIn = this.env.session.isLoggedIn();

    if (!options['cordova-res'] && !isLoggedIn) {
      this.env.log.warn(`You need to be logged into your Ionic account in order to run ${chalk.green(`ionic cordova resources`)}.\n`);
      await promptToLogin(this.env);
    }
  }

  async getBuildPlatforms() {
    const { getPlatforms } = await import('../../lib/integrations/cordova/project');
    const { RESOURCES } = await import('../../lib/integrations/cordova/resources');

    debug(`RESOURCES=${Object.keys(RESOURCES).length}`);

    const installedPlatforms = await getPlatforms(this.integration.root);
    debug(`installedPlatforms=${installedPlatforms.map(e => chalk.bold(e)).join(', ')}`);

    const buildPlatforms = Object.keys(RESOURCES).filter(p => installedPlatforms.includes(p));
    debug(`buildPlatforms=${buildPlatforms.map(v => chalk.bold(v)).join(', ')}`);

    return buildPlatforms;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const platform = inputs[0] ? String(inputs[0]) : undefined;

    if (options['cordova-res']) {
      await this.runCordovaRes(platform, options);
    } else {
      await this.runResourceServer(platform, options);
    }
  }

  async runCordovaRes(platform: string | undefined, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic cordova resources')} outside a project directory.`);
    }

    const log = this.env.log.clone();
    log.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(chalk.dim(`[cordova-res]`)));
    const ws = log.createWriteStream(LOGGER_LEVELS.INFO);

    const args: string[] = [];

    if (platform) {
      args.push(platform);
    }

    if (options['icon']) {
      args.push('--type', 'icon');
    } else if (options['splash']) {
      args.push('--type', 'splash');
    }

    if (options['verbose']) {
      args.push('--verbose');
    }

    try {
      await this.env.shell.run('cordova-res', args, { showCommand: true, fatalOnNotFound: false, cwd: this.project.directory, stream: ws });
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        const installArgs = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install', pkg: 'cordova-res', global: true });
        throw new FatalException(
          `${chalk.green('cordova-res')} was not found on your PATH. Please install it globally:\n` +
          `${chalk.green(installArgs.join(' '))}\n`
        );
      }

      throw e;
    }
  }

  async runResourceServer(platform: string | undefined, options: CommandLineOptions): Promise<void> {
    const { loadConfigXml } = await import('../../lib/integrations/cordova/config');
    const { addResourcesToConfigXml, createImgDestinationDirectories, findMostSpecificSourceImage, getImageResources, getSourceImages, transformResourceImage, uploadSourceImage } = await import('../../lib/integrations/cordova/resources');

    const { force } = options;
    const tasks = this.createTaskChain();

    // if no resource filters are passed as arguments assume to use all.
    let resourceTypes = AVAILABLE_RESOURCE_TYPES.filter((type, index, array) => options[type]);
    resourceTypes = resourceTypes.length ? resourceTypes : AVAILABLE_RESOURCE_TYPES;

    // await this.checkForPlatformInstallation(platform, { promptToInstall: true });

    const conf = await loadConfigXml(this.integration);
    const buildPlatforms = platform ? [platform] : await this.getBuildPlatforms();

    if (buildPlatforms.length === 0) {
      throw new FatalException(`No platforms detected. Please run: ${chalk.green('ionic cordova platform add')}`);
    }

    tasks.next(`Collecting resource configuration and source images`);

    const orientation = conf.getPreference('Orientation') || 'default';

    // Convert the resource structure to a flat array then filter the array so
    // that it only has img resources that we need. Finally add src path to the
    // items that remain.
    let imgResources = getImageResources(this.integration.root)
      .filter(img => orientation === 'default' || typeof img.orientation === 'undefined' || img.orientation === orientation)
      .filter(img => buildPlatforms.includes(img.platform))
      .filter(img => resourceTypes.includes(img.resType));

    if (platform) {
      imgResources = imgResources.filter(img => img.platform === platform);
    }

    debug(`imgResources=${imgResources.length}`);

    // Create the resource directories that are needed for the images we will create
    const buildDirResponses = await createImgDestinationDirectories(imgResources);
    debug(`${chalk.cyan('createImgDestinationDirectories')} completed: ${buildDirResponses.length}`);

    // Check /resources and /resources/<platform> directories for src files
    // Update imgResources to have their src attributes to equal the most
    // specific src img found
    let srcImagesAvailable: SourceImage[] = [];

    try {
      srcImagesAvailable = await getSourceImages(this.integration.root, buildPlatforms, resourceTypes);
      debug(`${chalk.cyan('getSourceImages')} completed: (${srcImagesAvailable.map(v => chalk.bold(prettyPath(v.path))).join(', ')})`);
    } catch (e) {
      this.env.log.error(`Error in ${chalk.green('getSourceImages')}: ${e.stack ? e.stack : e}`);
    }

    imgResources = imgResources.map(img => {
      const mostSpecificImageAvailable = findMostSpecificSourceImage(img, srcImagesAvailable);
      return {
        ...img,
        imageId: mostSpecificImageAvailable && mostSpecificImageAvailable.imageId ? mostSpecificImageAvailable.imageId : undefined,
      };
    });

    debug(`imgResources=${imgResources.length}`);

    // If there are any imgResources that have missing images then end
    // processing and inform the user
    const missingSrcImages = imgResources.filter(img => !img.imageId);
    if (missingSrcImages.length > 0) {
      const missingImageText = missingSrcImages
        .reduce((list, img) => {
          const str = `${img.platform}/${img.resType}`;
          if (!list.includes(str)) {
            list.push(str);
          }
          return list;
        }, [] as string[])
        .map(v => `- ${chalk.bold(v)}`)
        .join('\n');

      throw new FatalException(
        `Source image files were not found for the following platforms/types:\n${missingImageText}\n\n` +
        `Please review ${chalk.green('--help')}`
      );
    }

    tasks.next(`Filtering out image resources that do not need regeneration`);

    const cachedSourceIds = srcImagesAvailable
      .filter(img => img.imageId && img.cachedId && img.imageId === img.cachedId)
      .map(img => img.imageId);

    if (!force) {
      const keepImgResources = await Promise.all(imgResources.map(async img => {
        if (!await pathExists(img.dest)) {
          return true;
        }

        return img.imageId && !cachedSourceIds.includes(img.imageId);
      }));

      imgResources = imgResources.filter((img, i) => keepImgResources[i]);

      if (imgResources.length === 0) {
        tasks.end();
        this.env.log.nl();
        this.env.log.info(
          'No need to regenerate images.\n' +
          'This could mean your generated images exist and do not need updating or your source files are unchanged.\n\n' +
          `You can force image regeneration with the ${chalk.green('--force')} option.`
        );

        throw new FatalException('', 0);
      }
    }

    const uploadTask = tasks.next(`Uploading source images to prepare for transformations`);

    let count = 0;
    // Upload images to service to prepare for resource transformations
    const imageUploadResponses = await Promise.all(srcImagesAvailable.map(async srcImage => {
      const response = await uploadSourceImage(this.env, srcImage);
      count += 1;
      uploadTask.msg = `Uploading source images to prepare for transformations: ${chalk.bold(`${count} / ${srcImagesAvailable.length}`)} complete`;
      return response;
    }));

    debug(`${chalk.cyan('uploadSourceImages')} completed: responses=%O`, imageUploadResponses);

    srcImagesAvailable = srcImagesAvailable.map((img, index) => {
      return {
        ...img,
        width: imageUploadResponses[index].Width,
        height: imageUploadResponses[index].Height,
        vector: imageUploadResponses[index].Vector,
      };
    });

    debug('srcImagesAvailable=%O', srcImagesAvailable);

    // If any images are asking to be generated but are not of the correct size
    // inform the user and continue on.
    const imagesTooLargeForSource = imgResources.filter(img => {
      const resourceSourceImage = srcImagesAvailable.find(srcImage => srcImage.imageId === img.imageId);
      if (!resourceSourceImage) {
        return true;
      }

      return !resourceSourceImage.vector && (img.width > resourceSourceImage.width || img.height > resourceSourceImage.height);
    });

    debug('imagesTooLargeForSource=%O', imagesTooLargeForSource);

    // Remove all images too large for transformations
    imgResources = imgResources.filter(img => {
      return !imagesTooLargeForSource.find(tooLargeForSourceImage => img.name === tooLargeForSourceImage.name);
    });

    if (imgResources.length === 0) {
      tasks.end();
      this.env.log.nl();
      this.env.log.info('No need to regenerate images--images too large for transformation.'); // TODO: improve messaging
      throw new FatalException('', 0);
    }

    // Call the transform service and output images to appropriate destination
    const generateTask = tasks.next(`Generating platform resources`);
    count = 0;

    const transforms = imgResources.map(async img => {
      const result = await transformResourceImage(this.env, img);
      count += 1;
      generateTask.msg = `Generating platform resources: ${chalk.bold(`${count} / ${imgResources.length}`)} complete`;
      return result;
    });

    const transformResults = await Promise.all(transforms);
    generateTask.msg = `Generating platform resources: ${chalk.bold(`${imgResources.length} / ${imgResources.length}`)} complete`;
    debug('transforms completed');

    const transformErrors: Error[] = transformResults.map(result => result.error).filter((err): err is Error => typeof err !== 'undefined');

    if (transformErrors.length > 0) {
      throw new FatalException(
        `Encountered ${transformErrors.length} error(s) during image transforms:\n\n` +
        transformErrors.map((err, i) => `${i + 1}): ` + chalk.red(err.toString())).join('\n\n')
      );
    }

    await Promise.all(transformResults.map(async result => {
      await copy(result.tmpDest, result.resource.dest);
      debug('copied transformed image %s into project as %s', result.tmpDest, result.resource.dest);
    }));

    await Promise.all(srcImagesAvailable.map(async img => {
      await cacheFileChecksum(img.path, img.imageId);
    }));

    tasks.next(`Modifying config.xml to add new image resources`);
    const imageResourcesForConfig = imgResources.reduce((rc, img) => {
      if (!rc[img.platform]) {
        rc[img.platform] = {
          [img.resType]: {
            images: [],
            nodeName: '',
            nodeAttributes: [],
          },
        };
      }
      if (!rc[img.platform][img.resType]) {
        rc[img.platform][img.resType] = {
          images: [],
          nodeName: '',
          nodeAttributes: [],
        };
      }
      rc[img.platform][img.resType].images.push({
        name: img.name,
        width: img.width,
        height: img.height,
        density: img.density,
      } as ResourcesImageConfig);
      rc[img.platform][img.resType].nodeName = img.nodeName;
      rc[img.platform][img.resType].nodeAttributes = img.nodeAttributes;

      return rc;
    }, {} as ResourcesConfig);

    const platformList = Object.keys(imageResourcesForConfig) as KnownPlatform[];
    await addResourcesToConfigXml(conf, platformList, imageResourcesForConfig);

    tasks.end();

    // All images that were not processed
    if (imagesTooLargeForSource.length > 0) {
      const imagesTooLargeForSourceMsg = imagesTooLargeForSource
        .map(img => `    ${chalk.bold(img.name)}     ${img.platform}/${img.resType} needed ${img.width}×${img.height}px`)
        .concat((imagesTooLargeForSource.length > 0) ? `\nThe following images were not created because their source image was too small:` : [])
        .reverse();

      this.env.log.rawmsg(imagesTooLargeForSourceMsg.join('\n'));
    }

    await conf.save();
  }
}
