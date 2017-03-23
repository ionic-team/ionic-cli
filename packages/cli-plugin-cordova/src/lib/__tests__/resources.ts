import fetch from 'node-fetch';
import * as path from 'path';
import * as resources from '../resources';
import * as util from '@ionic/cli-utils';

import { ImageResource, SourceImage } from '../../definitions';

const resourcesJson = require('./fixtures/resources.json');

describe('resources', () => {

  it('flattenResourceJsonStructure should do take the resources.json structure and flatten it', () => {
    const result = resources.flattenResourceJsonStructure(resourcesJson);

    expect(result).toEqual(jasmine.any(Array));
    expect(result.length).toEqual(51);
    expect(result.find(img => img.name === 'Default-568h@2x~iphone.png')).toEqual({
      platform: 'ios',
      resType: 'splash',
      name: 'Default-568h@2x~iphone.png',
      width: 640,
      height: 1136,
      density: undefined,
      nodeName: 'splash',
      nodeAttributes: ['src', 'width', 'height']
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
      imageId: null
    }, {
      platform: 'ios',
      resType: 'splash',
      name: 'Default-Landscape-736h.png',
      width: 2208,
      height: 1242,
      density: undefined,
      nodeName: 'splash',
      nodeAttributes: ['src', 'width', 'height'],
      imageId: null
    }, {
      platform: 'android',
      resType: 'splash',
      name: 'drawable-land-ldpi-screen.png',
      width: 320,
      height: 240,
      density: 'land-ldpi',
      nodeName: 'splash' ,
      nodeAttributes: ['src', 'density'],
      imageId: null
    }]
      .map((img) => ({
        ...img,
        dest: path.join('/resourcesDir', img.platform, img.resType, img.name)
      }));

    it('should create directories that required for all of the images', async function() {
      spyOn(util, 'fsMkdirp').and.callFake((dir) => Promise.resolve(dir));
      await resources.createImgDestinationDirectories(imgResources);

      expect((<jasmine.Spy>util.fsMkdirp).calls.count()).toEqual(2);
      expect((<jasmine.Spy>util.fsMkdirp).calls.argsFor(0)).toEqual(['/resourcesDir/ios/splash']);
      expect((<jasmine.Spy>util.fsMkdirp).calls.argsFor(1)).toEqual(['/resourcesDir/android/splash']);
    });
  });

  describe('getSourceImages', () => {
    it('should look in resources directory and platform directories to find images', async function() {
      spyOn(util, 'fsReadDir').and.returnValue(Promise.resolve([]));

      await resources.getSourceImages(['ios', 'android'], ['splash', 'icon'], '/resourceDir');

      expect((<jasmine.Spy>util.fsReadDir).calls.count()).toEqual(3);
      expect((<jasmine.Spy>util.fsReadDir).calls.argsFor(0)).toEqual(['/resourceDir/ios']);
      expect((<jasmine.Spy>util.fsReadDir).calls.argsFor(1)).toEqual(['/resourceDir/android']);
      expect((<jasmine.Spy>util.fsReadDir).calls.argsFor(2)).toEqual(['/resourceDir']);
    });

    it('should find all sourceImages available and prioritize based on specificity', async function() {
      spyOn(util, 'getFileChecksum').and.returnValue(Promise.resolve('FJDKLFJDKL'));
      spyOn(util, 'fsReadDir').and.callFake((dir) => {
        switch (dir) {
        case '/resourceDir/ios':
          return Promise.resolve([
            'icon.png',
            'splash.jpg',
            'things.ai'
          ]);
        case '/resourceDir/android':
          return Promise.resolve([
            'icon.ai',
            'splash.png'
          ]);
        case '/resourceDir':
          return Promise.resolve([
            'icon.png',
            'splash.psd'
          ]);
        default: [];
        }
      });

      const sourceImages = await resources.getSourceImages(['ios', 'android'], ['splash', 'icon'], '/resourceDir');
      expect(sourceImages).toEqual([
        {
          ext: '.png',
          height: 0,
          imageId: 'FJDKLFJDKL',
          platform: 'ios',
          resType: 'icon',
          path: '/resourceDir/ios/icon.png',
          vector: false,
          width: 0
        },
        {
          ext: '.ai',
          height: 0,
          imageId: 'FJDKLFJDKL',
          platform: 'android',
          resType: 'icon',
          path: '/resourceDir/android/icon.ai',
          vector: false,
          width: 0
        },
        {
          ext: '.png',
          height: 0,
          imageId: 'FJDKLFJDKL',
          platform: 'android',
          resType: 'splash',
          path: '/resourceDir/android/splash.png',
          vector: false,
          width: 0
        },
        {
          ext: '.png',
          height: 0,
          imageId: 'FJDKLFJDKL',
          platform: 'global',
          resType: 'icon',
          path: '/resourceDir/icon.png',
          vector: false,
          width: 0
        },
        {
          ext: '.psd',
          height: 0,
          imageId: 'FJDKLFJDKL',
          platform: 'global',
          resType: 'splash',
          path: '/resourceDir/splash.psd',
          vector: false,
          width: 0
        }
      ]);
    });
  });

  describe('findMostSpecificImage', () => {
    const srcImagesAvailable: SourceImage[] = [
      {
        width: 640,
        height: 1136,
        vector: false,
        ext: '.png',
        platform: 'ios',
        resType: 'icon',
        path: '/resourceDir/ios/icon.png'
      },
      {
        width: 640,
        height: 1136,
        vector: false,
        ext: '.ai',
        platform: 'android',
        resType: 'icon',
        path: '/resourceDir/android/icon.ai'
      },
      {
        width: 640,
        height: 1136,
        vector: false,
        ext: '.png',
        platform: 'android',
        resType: 'splash',
        path: '/resourceDir/android/splash.png'
      },
      {
        width: 640,
        height: 1136,
        vector: false,
        ext: '.png',
        platform: 'global',
        resType: 'icon',
        path: '/resourceDir/icon.png'
      },
      {
        width: 640,
        height: 1136,
        vector: false,
        ext: '.psd',
        platform: 'global',
        resType: 'splash',
        path: '/resourceDir/splash.psd'
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
        imageId: null,
        dest: '/resourcesDir/ios/splash/Default-568h@2x~iphone.png'
      };

      const result = resources.findMostSpecificImage(imgResource, srcImagesAvailable);

      expect(result).toEqual({
        width: 640,
        height: 1136,
        vector: false,
        ext: '.psd',
        platform: 'global',
        resType: 'splash',
        path: '/resourceDir/splash.psd'
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
        imageId: null,
        dest: '/resourcesDir/ios/splash/Default-568h@2x~iphone.png'
      };

      const result = resources.findMostSpecificImage(imgResource, srcImagesAvailable);

      expect(result).toEqual({
        ext: '.png',
        platform: 'ios',
        resType: 'icon',
        path: '/resourceDir/ios/icon.png',
        width: 640,
        height: 1136,
        vector: false
      });
    });
  });

  // TODO: this is currently hitting the service, we should mock
  describe('uploadSourceImages', () => {
    it('should upload an image and receive back metadata', async function() {
      const fetchSpy = {
        json: () => ({
          Error: '',
          Width: 337,
          Height: 421,
          Type: 'png',
          Vector: false
        })
      };

      spyOn(fetch, 'default').and.returnValue(Promise.resolve(fetchSpy));

      const sourceImages: SourceImage[] = [{
        ext: '.png',
        height: 421,
        width: 337,
        vector: false,
        platform: 'ios',
        resType: 'icon',
        path: path.join(__dirname, 'fixtures', 'icon.png'),
        imageId: '60278b0fa1d5abf43d07c5ae0f8a0b41'
      }];

      const response = await resources.uploadSourceImages(sourceImages);
      expect(response).toEqual([{
        Error: '',
        Width: 337,
        Height: 421,
        Type: 'png',
        Vector: false
      }]);
    });
  });

  // TODO: this is currently hitting the service, we should mock
  describe('transformResourceImage', () => {
    it('should upload an image and write a stream to the destination', async function() {
      const fetchSpy = {
        status: 200,
        body: {
          Error: '',
          Width: 320,
          Height: 240,
          Type: 'png',
          Vector: false
        }
      };

      spyOn(util, 'writeStreamToFile');
      spyOn(fetch, 'default').and.returnValue(Promise.resolve(fetchSpy));

      const imgResource: ImageResource = {
        platform: 'android',
        resType: 'splash',
        name: 'drawable-land-ldpi-screen.png',
        width: 320,
        height: 240,
        density: 'land-ldpi',
        nodeName: 'splash' ,
        nodeAttributes: ['src', 'density'],
        imageId: '60278b0fa1d5abf43d07c5ae0f8a0b41',
        dest: path.join(__dirname, 'fixtures', 'drawable-land-ldpi-screen.png')
      };

      await resources.transformResourceImage(imgResource);

      expect(util.writeStreamToFile).toHaveBeenCalledWith(
        jasmine.any(Object), imgResource.dest
      );
    });
  });
});
