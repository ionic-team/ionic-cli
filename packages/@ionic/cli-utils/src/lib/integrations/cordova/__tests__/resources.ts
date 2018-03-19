import * as path from 'path';

import * as fsSpy from '@ionic/cli-framework/utils/fs';

import * as httpSpy from '../../../utils/http';
import * as resources from '../resources';

import { ImageResource, SourceImage } from '../../../../definitions';

describe('@ionic/cli-utils', () => {

  describe('lib/cordova/resources', () => {

    describe('getImageResources', () => {

      it('should take the resources structure and flatten it', async () => {
        const result = resources.getImageResources('/path/to/proj');

        expect(result).toEqual(jasmine.any(Array));
        expect(result.length).toEqual(53);
        expect(result.find(img => img.name === 'Default-568h@2x~iphone.png')).toEqual({
          platform: 'ios',
          resType: 'splash',
          name: 'Default-568h@2x~iphone.png',
          dest: '/path/to/proj/resources/ios/splash/Default-568h@2x~iphone.png',
          width: 640,
          height: 1136,
          density: undefined,
          orientation: 'portrait',
          nodeName: 'splash',
          nodeAttributes: ['src', 'width', 'height'],
        });
      });

    });

    describe('createImgDestinationDirectories', () => {
      const imgResources: ImageResource[] = [{
        platform: 'ios',
        resType: 'splash',
        name: 'Default-568h@2x~iphone.png',
        width: 640,
        height: 1136,
        density: undefined,
        nodeName: 'splash',
        nodeAttributes: ['src', 'width', 'height'],
        imageId: undefined,
      }, {
        platform: 'ios',
        resType: 'splash',
        name: 'Default-Landscape-736h.png',
        width: 2208,
        height: 1242,
        density: undefined,
        nodeName: 'splash',
        nodeAttributes: ['src', 'width', 'height'],
        imageId: undefined,
      }, {
        platform: 'android',
        resType: 'splash',
        name: 'drawable-land-ldpi-screen.png',
        width: 320,
        height: 240,
        density: 'land-ldpi',
        nodeName: 'splash' ,
        nodeAttributes: ['src', 'density'],
        imageId: undefined,
      }]
        .map((img) => ({
          ...img,
          dest: path.join('/resourcesDir', img.platform, img.resType, img.name)
        }));

      it('should create directories that required for all of the images', async () => {
        spyOn(fsSpy, 'fsMkdirp').and.callFake((dir) => Promise.resolve(dir));
        await resources.createImgDestinationDirectories(imgResources);

        expect(fsSpy.fsMkdirp.calls.count()).toEqual(2);
        expect(fsSpy.fsMkdirp.calls.argsFor(0)).toEqual(['/resourcesDir/ios/splash']);
        expect(fsSpy.fsMkdirp.calls.argsFor(1)).toEqual(['/resourcesDir/android/splash']);
      });
    });

    describe('getSourceImages', () => {
      it('should look in resources directory and platform directories to find images', async () => {
        spyOn(fsSpy, 'readDir').and.returnValue(Promise.resolve([]));

        await resources.getSourceImages('/path/to/proj', ['ios', 'android'], ['splash', 'icon']);

        expect(fsSpy.readDir.calls.count()).toEqual(3);
        expect(fsSpy.readDir.calls.argsFor(0)).toEqual(['/path/to/proj/resources/ios']);
        expect(fsSpy.readDir.calls.argsFor(1)).toEqual(['/path/to/proj/resources/android']);
        expect(fsSpy.readDir.calls.argsFor(2)).toEqual(['/path/to/proj/resources']);
      });

      it('should find all sourceImages available and prioritize based on specificity', async () => {
        spyOn(fsSpy, 'getFileChecksums').and.returnValue(Promise.resolve(['FJDKLFJDKL', undefined]));
        spyOn(fsSpy, 'cacheFileChecksum').and.callFake(() => {});
        spyOn(fsSpy, 'readDir').and.callFake(dir => {
          switch (dir) {
            case '/path/to/proj/resources/ios':
              return Promise.resolve([
                'icon.png',
                'splash.jpg',
                'things.ai'
              ]);
            case '/path/to/proj/resources/android':
              return Promise.resolve([
                'icon.ai',
                'splash.png'
              ]);
            case '/path/to/proj/resources':
              return Promise.resolve([
                'icon.png',
                'splash.psd'
              ]);
            default: [];
          }
        });

        const sourceImages = await resources.getSourceImages('/path/to/proj', ['ios', 'android'], ['splash', 'icon']);
        expect(sourceImages).toEqual([
          {
            ext: '.png',
            height: 0,
            imageId: 'FJDKLFJDKL',
            platform: 'ios',
            resType: 'icon',
            path: '/path/to/proj/resources/ios/icon.png',
            vector: false,
            width: 0
          },
          {
            ext: '.ai',
            height: 0,
            imageId: 'FJDKLFJDKL',
            platform: 'android',
            resType: 'icon',
            path: '/path/to/proj/resources/android/icon.ai',
            vector: false,
            width: 0
          },
          {
            ext: '.png',
            height: 0,
            imageId: 'FJDKLFJDKL',
            platform: 'android',
            resType: 'splash',
            path: '/path/to/proj/resources/android/splash.png',
            vector: false,
            width: 0
          },
          {
            ext: '.png',
            height: 0,
            imageId: 'FJDKLFJDKL',
            platform: 'global',
            resType: 'icon',
            path: '/path/to/proj/resources/icon.png',
            vector: false,
            width: 0
          },
          {
            ext: '.psd',
            height: 0,
            imageId: 'FJDKLFJDKL',
            platform: 'global',
            resType: 'splash',
            path: '/path/to/proj/resources/splash.psd',
            vector: false,
            width: 0
          }
        ]);
      });
    });

    describe('findMostSpecificSourceImage', () => {
      const srcImagesAvailable: SourceImage[] = [
        {
          width: 640,
          height: 1136,
          vector: false,
          ext: '.png',
          platform: 'ios',
          resType: 'icon',
          path: '/path/to/proj/resources/ios/icon.png'
        },
        {
          width: 640,
          height: 1136,
          vector: false,
          ext: '.ai',
          platform: 'android',
          resType: 'icon',
          path: '/path/to/proj/resources/android/icon.ai'
        },
        {
          width: 640,
          height: 1136,
          vector: false,
          ext: '.png',
          platform: 'android',
          resType: 'splash',
          path: '/path/to/proj/resources/android/splash.png'
        },
        {
          width: 640,
          height: 1136,
          vector: false,
          ext: '.png',
          platform: 'global',
          resType: 'icon',
          path: '/path/to/proj/resources/icon.png'
        },
        {
          width: 640,
          height: 1136,
          vector: false,
          ext: '.psd',
          platform: 'global',
          resType: 'splash',
          path: '/path/to/proj/resources/splash.psd'
        }
      ];

      it('should find the most specific image using globals as less specific than platforms', () => {
        const imgResource: ImageResource = {
          platform: 'ios',
          resType: 'splash',
          name: 'Default-568h@2x~iphone.png',
          width: 640,
          height: 1136,
          density: undefined,
          nodeName: 'splash',
          nodeAttributes: ['src', 'width', 'height'],
          imageId: undefined,
          dest: '/resourcesDir/ios/splash/Default-568h@2x~iphone.png'
        };

        const result = resources.findMostSpecificSourceImage(imgResource, srcImagesAvailable);

        expect(result).toEqual({
          width: 640,
          height: 1136,
          vector: false,
          ext: '.psd',
          platform: 'global',
          resType: 'splash',
          path: '/path/to/proj/resources/splash.psd'
        });
      });

      it('should find the most specific image in a platform dir when available', () => {
        const imgResource: ImageResource = {
          platform: 'ios',
          resType: 'icon',
          name: 'Default-568h@2x~iphone.png',
          width: 640,
          height: 1136,
          density: undefined,
          nodeName: 'icon',
          nodeAttributes: ['src', 'width', 'height'],
          imageId: undefined,
          dest: '/resourcesDir/ios/splash/Default-568h@2x~iphone.png'
        };

        const result = resources.findMostSpecificSourceImage(imgResource, srcImagesAvailable);

        expect(result).toEqual({
          ext: '.png',
          platform: 'ios',
          resType: 'icon',
          path: '/path/to/proj/resources/ios/icon.png',
          width: 640,
          height: 1136,
          vector: false
        });
      });
    });

    describe('uploadSourceImage', () => {
      it('should upload an image and receive back metadata', async () => {
        const createRequestSpy = jest.spyOn(httpSpy, 'createRequest');
        const createRequestMock = Promise.resolve({ req: {
          type: jest.fn().mockReturnThis(),
          attach: jest.fn().mockReturnThis(),
          field: jest.fn(() => Promise.resolve({
            body: {
              Error: '',
              Width: 337,
              Height: 421,
              Type: 'png',
              Vector: false
            }
          }))
        }});

        createRequestSpy.mockImplementationOnce(() => createRequestMock);

        const sourceImage = {
          ext: '.png',
          height: 421,
          width: 337,
          vector: false,
          platform: 'ios',
          resType: 'icon',
          path: path.join(__dirname, 'fixtures', 'icon.png'),
          imageId: '60278b0fa1d5abf43d07c5ae0f8a0b41'
        };

        const response = await resources.uploadSourceImage({ config: { load: async () => undefined } }, sourceImage);
        expect(response).toEqual({
          Error: '',
          Width: 337,
          Height: 421,
          Type: 'png',
          Vector: false
        });
      });
    });

  });

});
