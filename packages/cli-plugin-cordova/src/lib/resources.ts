import * as path from 'path';
import { ImageResource, SourceImage } from '../definitions';
import { fsReadDir, fsMkdirp } from '@ionic/cli-utils';

const SUPPORTED_SOURCE_EXTENSIONS = ['.psd', '.ai', '.png'];

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
 * Get all platforms based on resource/platforms directories
 * TODO: should we get this from the config.xml or just the directories like app-lib
 */
export async function getProjectPlatforms (jsonStructure: any, platformsDir: string): Promise<string[]> {
  let platformDirContents: string[] = [];

  try {
    platformDirContents = await fsReadDir(platformsDir);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('No platforms have been added.');
    }
    throw e;
  }

  return Object.keys(jsonStructure).filter(platform => platformDirContents.indexOf(platform) !== -1);
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

  return flatten(
    srcImageDirContentList.map((srcImageDirContents, index) => (
      srcImageDirContents
        .map((imgName: string): SourceImage => {
          const ext = path.extname(imgName);

          return {
            ext,
            platform: srcDirList[index].platform,
            resType: path.basename(imgName, ext),
            path: path.join(srcDirList[index].path, imgName),
          };
        })
        .filter((img: SourceImage) => SUPPORTED_SOURCE_EXTENSIONS.indexOf(img.ext) !== -1)
        .filter((img: SourceImage) => resourceTypes.indexOf(img.resType) !== -1)
    ))
  );
}

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

function flatten(arr: any[]): any[] {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}
