import * as path from 'path';
import * as fs from 'fs';
import * as FormData from 'form-data';
import fetch from 'node-fetch';

import {
  ImageResource,
  SourceImage,
  ImageUploadResponse,
  ResourcesConfig,
  KnownPlatform
} from '../definitions';
import {
  fsReadDir,
  fsMkdirp,
  fsReadJsonFile,
  ERROR_FILE_NOT_FOUND,
  ERROR_FILE_INVALID_JSON,
  getFileChecksum,
  writeStreamToFile,
  copyDirectory
} from '@ionic/cli-utils';

import {
  writeConfigXml,
  parseConfigXml,
  addPlatformImagesToConfigJson,
  addSplashScreenPreferencesToConfigJson
} from './utils/configXmlUtils';

const SUPPORTED_SOURCE_EXTENSIONS = ['.psd', '.ai', '.png'];
const UPLOAD_URL = 'http://res.ionic.io/api/v1/upload';
const TRANSFORM_URL = 'http://res.ionic.io/api/v1/transform';
const DEFAULT_RESOURCES_DIR = path.resolve(__dirname, '..', '..', 'default-resources');

/**
 * Take the JSON structure for resources.json and turn it into a flat array
 * that contains only images and turns all struture info into attributes of the image
 * items.
 */
export function flattenResourceJsonStructure (jsonStructure: any): ImageResource[] {
  return flatten(Object.keys(jsonStructure).map(platform => (
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
    )))
  ));
}

/**
 *
 */
export async function createImgDestinationDirectories (imgResources: ImageResource[]): Promise<void[]> {
  const buildDirPromises: Promise<void>[] = imgResources
    .map(img => path.dirname(img.dest))
    .filter((dir, index, dirNames) => dirNames.indexOf(dir) === index)
    .map(dir => fsMkdirp(dir));

  return Promise.all(buildDirPromises);
}

/**
 *
 */
export async function getResourceConfigJson(): Promise<ResourcesConfig> {
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
  return <ResourcesConfig>resourceJsonStructure;
}

/**
 *
 */
export async function getSourceImages (buildPlatforms: string[], resourceTypes: string[], resourceDir: string): Promise<SourceImage[]> {
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
    srcDirList.map((srcImgDir: any) => fsReadDir(srcImgDir.path))
  );

  const sourceImages = flatten(
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
 *
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
 *
 */
export async function uploadSourceImages(srcImages: SourceImage[]): Promise<ImageUploadResponse[]> {
  return Promise.all(
    srcImages.map(async function(srcImage) {
      const form = new FormData();
      form.append('image_id', srcImage.imageId);
      form.append('src', fs.createReadStream(srcImage.path));

      try {
        const response = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: form
        });
        return response.json();
      } catch (e) {
        console.log(JSON.stringify(e, null, 2));
        throw e;
      }
    })
  );
}

/**
 *
 */
export async function generateResourceImage(imageResource: ImageResource): Promise<void> {
  const form = new FormData();
  form.append('image_id', imageResource.imageId);
  form.append('width', imageResource.width);
  form.append('height', imageResource.height);
  form.append('res_type', imageResource.resType);
  form.append('crop', 'center');
  form.append('encoding', 'png');

  try {
    const response = await fetch(TRANSFORM_URL, {
      method: 'POST',
      body: form
    });

    if (response.status !== 200) {
      const responseBody: string = await streamToString(response.body);
      throw new Error(`STATUS: ${response.status} ${responseBody}`);
    }

    await writeStreamToFile(response.body, imageResource.dest);
  } catch (e) {
    throw e;
  }
}

/**
 *
 */
function flatten(arr: any[]): any[] {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

/**
 *
 */
function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream
      .on('error', reject)
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 *
 */
export async function addDefaultImagesToResources(projectDirectory: string, platform: KnownPlatform): Promise<any> {

  // Copy default resources into the platform directory
  const resourcesDir = path.resolve(projectDirectory, 'resources', platform);
  const platformResourceDir = path.resolve(DEFAULT_RESOURCES_DIR, platform);
  await fsMkdirp(platformResourceDir);
  await copyDirectory(platformResourceDir, resourcesDir);

  const resourceJson = await getResourceConfigJson();

  return addResourcesToConfigXml(projectDirectory, [platform], resourceJson);
}

/**
 *
 */
export async function addResourcesToConfigXml(projectDirectory: string, platformList: KnownPlatform[], resourceJson: ResourcesConfig): Promise<any> {
  let configJson = await parseConfigXml(projectDirectory);

  if (!configJson.widget.platform || configJson.widget.platform.length === 0) {
    throw `Config.xml does not contain a platform entry.`;
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
