import * as path from 'path';

import {
  ImageResource,
  SourceImage,
  ImageUploadResponse,
  ResourcesConfig,
  KnownPlatform
} from '../definitions';
import {
  ERROR_FILE_INVALID_JSON,
  ERROR_FILE_NOT_FOUND,
  copyDirectory,
  createRequest,
  flattenArray,
  fsMkdirp,
  fsReadJsonFile,
  getFileChecksum,
  readDir,
  writeStreamToFile,
} from '@ionic/cli-utils';

import {
  writeConfigXml,
  parseConfigXmlToJson,
  addPlatformImagesToConfigJson,
  addSplashScreenPreferencesToConfigJson
} from './utils/configXmlUtils';

const SUPPORTED_SOURCE_EXTENSIONS = ['.psd', '.ai', '.png'];
const UPLOAD_URL = 'https://res.ionic.io/api/v1/upload';
const TRANSFORM_URL = 'https://res.ionic.io/api/v1/transform';
const RESOURCES_CONFIG_FILE = path.resolve(__dirname, '..', 'resources.json');
const DEFAULT_RESOURCES_DIR = path.resolve(__dirname, '..', 'default-resources');

/**
 * Take the JSON structure for resources.json and turn it into a flat array
 * that contains only images and turns all struture info into attributes of the image
 * items.
 */
export function flattenResourceJsonStructure (jsonStructure: any): ImageResource[] {
  return flattenArray(Object.keys(jsonStructure).map(platform => (
    Object.keys(jsonStructure[platform]).map(resType => (
      jsonStructure[platform][resType]['images'].map((imgInfo: any) => (
        {
          platform,
          resType,
          name: imgInfo.name,
          width: imgInfo.width,
          height: imgInfo.height,
          density: imgInfo.density,
          orientation: imgInfo.orientation,
          nodeName: jsonStructure[platform][resType]['nodeName'],
          nodeAttributes: jsonStructure[platform][resType]['nodeAttributes']
        }
      ))
    )))
  ));
}

/**
 * Create the destination directories for the provided image resources.
 */
export async function createImgDestinationDirectories (imgResources: ImageResource[]): Promise<void[]> {
  const buildDirPromises: Promise<void>[] = imgResources
    .map(img => path.dirname(img.dest))
    .filter((dir, index, dirNames) => dirNames.indexOf(dir) === index)
    .map(dir => fsMkdirp(dir));

  return Promise.all(buildDirPromises);
}

/**
 * Read the resources config and return the Json.
 */
export async function getResourceConfigJson(): Promise<ResourcesConfig> {
  let resourceJsonStructure;
  const filePath = RESOURCES_CONFIG_FILE;
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
  return <ResourcesConfig>resourceJsonStructure;
}

/**
 * Find all source images within the resources directory
 */
export async function getSourceImages(buildPlatforms: string[], resourceTypes: string[], resourceDir: string): Promise<SourceImage[]> {
  const srcDirList = buildPlatforms
    .map((platform: string) => (
      {
        platform,
        path: path.join(resourceDir, platform)
      }
    ))
    .concat({
      platform: 'global',
      path: resourceDir
    });

  const srcImageDirContentList = await Promise.all(
    srcDirList.map((srcImgDir: any) => readDir(srcImgDir.path))
  );

  const sourceImages = flattenArray(
    srcImageDirContentList.map((srcImageDirContents, index) => (
      srcImageDirContents
        .map((imgName: string): SourceImage => {
          const ext = path.extname(imgName);

          return {
            ext,
            platform: srcDirList[index].platform,
            resType: path.basename(imgName, ext),
            path: path.join(srcDirList[index].path, imgName),
            vector: false,
            height: 0,
            width: 0
          };
        })
        .filter((img: SourceImage) => SUPPORTED_SOURCE_EXTENSIONS.includes(img.ext))
        .filter((img: SourceImage) => resourceTypes.includes(img.resType))
    ))
  );

  const sourceImageChecksums = await Promise.all(
    sourceImages.map(img => getFileChecksum(img.path))
  );

  return sourceImages.map((img: SourceImage, index) => ({
    ...img,
    imageId: sourceImageChecksums[index]
  }));
}

/**
 * Find the source image that matches the requirements of the image resource provided.
 */
export function findMostSpecificImage(imageResource: ImageResource, srcImagesAvailable: SourceImage[]): SourceImage | null {
  return srcImagesAvailable.reduce((mostSpecificImage: SourceImage | null, sourceImage: SourceImage) => {
    if (sourceImage.platform === imageResource.platform && sourceImage.resType === imageResource.resType) {
      return sourceImage;
    }
    if (sourceImage.platform === 'global' && sourceImage.resType === imageResource.resType && !mostSpecificImage) {
      return sourceImage;
    }
    return mostSpecificImage;
  }, null);
}

/**
 * Upload the provided source image through the resources web service. This will make it available
 * for transforms for the next 5 minutes.
 */
export async function uploadSourceImages(srcImages: SourceImage[], timeout: boolean | undefined): Promise<ImageUploadResponse[]> {
  return Promise.all(
    srcImages.map(async (srcImage) => {
      const res = await createRequest('POST', UPLOAD_URL)
        .timeout({ response: timeout ? 120000 : 0 })
        .type('form')
        .attach('src', srcImage.path)
        .field('image_id', srcImage.imageId || '');
      return res.body;
    })
  );
}

/**
 * Using the transformation web service transform the provided image resource
 * into the appropriate w x h and then write this file to the provided destination directory.
 */
export function transformResourceImage(imageResource: ImageResource, timeout: boolean | undefined) {
  return new Promise<void>((resolve, reject) => {
    const req = createRequest('POST', TRANSFORM_URL)
      .timeout({ response: timeout ? 120000 : 0 })
      .type('form')
      .send({
        'name': imageResource.name,
        'image_id': imageResource.imageId,
        'width': imageResource.width,
        'height': imageResource.height,
        'res_type': imageResource.resType,
        'crop': 'center',
        'encoding': 'png',
      })
      .on('response', (res) => {
        if (res.statusCode !== 200) {
          let bufs: Buffer[] = [];

          res.on('data', (chunk: Buffer) => {
            bufs.push(chunk);
          });

          res.on('end', () => {
            const buf = Buffer.concat(bufs);
            const body = buf.toString();
            reject(new Error(`encountered bad status code (${res.statusCode}) for ${TRANSFORM_URL}\nbody: ${body}`));
          });
        }
      })
      .on('error', (err) => {
        if (err.code === 'ECONNABORTED') {
          reject(new Error(`timeout of ${err.timeout}ms reached for ${TRANSFORM_URL}`));
        } else {
          reject(err);
        }
      });

    writeStreamToFile(req, imageResource.dest).then(resolve, reject);
  });
}

/**
 * Add images within the Default resources directory to the resources directory for the provided platform.
 * Also write this information to the project's config.xml file
 */
export async function addDefaultImagesToProjectResources(projectDirectory: string, platform: KnownPlatform): Promise<void> {

  // Copy default resources into the platform directory
  const resourcesDir = path.resolve(projectDirectory, 'resources', platform);
  const platformResourceDir = path.resolve(DEFAULT_RESOURCES_DIR, platform);
  await fsMkdirp(platformResourceDir);
  await copyDirectory(platformResourceDir, resourcesDir);

  const resourceJson = await getResourceConfigJson();

  return addResourcesToConfigXml(projectDirectory, [platform], resourceJson);
}

/**
 * Add image resource references for the provided platforms to the project's config.xml file.
 */
export async function addResourcesToConfigXml(projectDirectory: string, platformList: KnownPlatform[], resourceJson: ResourcesConfig): Promise<void> {
  let configJson = await parseConfigXmlToJson(projectDirectory);

  if (!configJson.widget.platform || configJson.widget.platform.length === 0) {
    throw `Config.xml does not contain a platform entry. Please compare your config.xml file with one of our starter projects.`;
  }

  platformList.forEach((platform) => {
    if (!configJson.widget.platform.find((pl: any) => pl['$'].name === platform)) {
      throw `Config.xml does not contain an entry for ${platform}`;
    }
    configJson = addPlatformImagesToConfigJson(configJson, platform, resourceJson);
  });

  configJson = addSplashScreenPreferencesToConfigJson(configJson);

  return writeConfigXml(projectDirectory, configJson);
}
