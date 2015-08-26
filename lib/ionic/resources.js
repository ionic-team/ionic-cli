var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    Q = require('q'),
    argv = require('optimist').argv,
    request = require('request'),
    xml2js = require('xml2js'),
    _ = require('underscore'),
    crc = require('crc'),
    Task = require('./task').Task,
    shelljs = require('shelljs'),
    moduleSettings = require('../../package.json'),
    IonicAppLib = require('ionic-app-lib'),
    Utils = IonicAppLib.utils,
    IonicStats = require('./stats').IonicStats;

var IonicResources = function() {};
IonicResources.prototype = new Task();

var tmpDir = os.tmpdir();
var configData, buildPlatforms, images, generateQueue, sourceFiles, generatingImages;
var generateLandscape, generatePortrait, orientation;

var ResSettings = {
  apiUrl: 'http://res.ionic.io',
  apiUploadPath: '/api/v1/upload',
  apiTransformPath: '/api/v1/transform',
  resourceDir: 'resources',
  iconDir: 'icon',
  splashDir: 'splash',
  iconSourceFile: 'icon',
  splashSourceFile: 'splash',
  sourceExtensions: ['psd', 'ai', 'png'],
  configFile: 'config.xml',
  generateThrottle: 4,
  defaultMaxIconSize: 96,
  cacheImages: true
};

var ResPlatforms = {

  android: {
    icon: {
      images: [
        { name: 'drawable-ldpi-icon.png',    width: 36,   height: 36,   density: "ldpi" },
        { name: 'drawable-mdpi-icon.png',    width: 48,   height: 48,   density: "mdpi" },
        { name: 'drawable-hdpi-icon.png',    width: 72,   height: 72,   density: "hdpi" },
        { name: 'drawable-xhdpi-icon.png',   width: 96,   height: 96,   density: "xhdpi" },
        { name: 'drawable-xxhdpi-icon.png',  width: 144,  height: 144,  density: "xxhdpi" },
        { name: 'drawable-xxxhdpi-icon.png', width: 192,  height: 192,  density: "xxxhdpi" }
      ],
      nodeName: 'icon',
      nodeAttributes: ['src', 'density']
    },
    splash: {
      images: [
        { name: 'drawable-land-ldpi-screen.png',    width: 320,   height: 240,   density: 'land-ldpi' },
        { name: 'drawable-land-mdpi-screen.png',    width: 480,   height: 320,   density: 'land-mdpi' },
        { name: 'drawable-land-hdpi-screen.png',    width: 800,   height: 480,   density: 'land-hdpi' },
        { name: 'drawable-land-xhdpi-screen.png',   width: 1280,  height: 720,   density: 'land-xhdpi' },
        { name: 'drawable-land-xxhdpi-screen.png',  width: 1600,  height: 960,   density: 'land-xxhdpi' },
        { name: 'drawable-land-xxxhdpi-screen.png', width: 1920,  height: 1280,  density: 'land-xxxhdpi' },
        { name: 'drawable-port-ldpi-screen.png',    width: 240,   height: 320,   density: 'port-ldpi' },
        { name: 'drawable-port-mdpi-screen.png',    width: 320,   height: 480,   density: 'port-mdpi' },
        { name: 'drawable-port-hdpi-screen.png',    width: 480,   height: 800,   density: 'port-hdpi' },
        { name: 'drawable-port-xhdpi-screen.png',   width: 720,   height: 1280,  density: 'port-xhdpi' },
        { name: 'drawable-port-xxhdpi-screen.png',  width: 960,   height: 1600,  density: 'port-xxhdpi' },
        { name: 'drawable-port-xxxhdpi-screen.png', width: 1280,  height: 1920,  density: 'port-xxxhdpi' }
      ],
      nodeName: 'splash',
      nodeAttributes: ['src', 'density']
    }
  },

  ios: {
    icon: {
      images: [
        { name: 'icon.png',             width: 57,    height: 57 },
        { name: 'icon@2x.png',          width: 114,   height: 114 },
        { name: 'icon-40.png',          width: 40,    height: 40 },
        { name: 'icon-40@2x.png',       width: 80,    height: 80 },
        { name: 'icon-50.png',          width: 50,    height: 50 },
        { name: 'icon-50@2x.png',       width: 100,   height: 100 },
        { name: 'icon-60.png',          width: 60,    height: 60 },
        { name: 'icon-60@2x.png',       width: 120,   height: 120 },
        { name: 'icon-60@3x.png',       width: 180,   height: 180 },
        { name: 'icon-72.png',          width: 72,    height: 72 },
        { name: 'icon-72@2x.png',       width: 144,   height: 144 },
        { name: 'icon-76.png',          width: 76,    height: 76 },
        { name: 'icon-76@2x.png',       width: 152,   height: 152 },
        { name: 'icon-small.png',       width: 29,    height: 29 },
        { name: 'icon-small@2x.png',    width: 58,    height: 58 },
        { name: 'icon-small@3x.png',    width: 87,    height: 87 }
      ],
      nodeName: 'icon',
      nodeAttributes: ['src', 'width', 'height']
    },
    splash: {
      images: [
        { name: 'Default-568h@2x~iphone.png',     width: 640,   height: 1136 },
        { name: 'Default-667h.png',               width: 750,   height: 1334 },
        { name: 'Default-736h.png',               width: 1242,  height: 2208 },
        { name: 'Default-Landscape-736h.png',     width: 2208,  height: 1242 },
        { name: 'Default-Landscape@2x~ipad.png',  width: 2048,  height: 1536 },
        { name: 'Default-Landscape~ipad.png',     width: 1024,  height: 768 },
        { name: 'Default-Portrait@2x~ipad.png',   width: 1536,  height: 2048 },
        { name: 'Default-Portrait~ipad.png',      width: 768,   height: 1024 },
        { name: 'Default@2x~iphone.png',          width: 640,   height: 960 },
        { name: 'Default~iphone.png',             width: 320,   height: 480 }
      ],
      nodeName: 'splash',
      nodeAttributes: ['src', 'width', 'height']
    }
  },

  wp8: {
    icon: {
      images: [
        { name: 'ApplicationIcon.png',  width: 99,   height: 99 },
        { name: 'Background.png',       width: 159,  height: 159 }
      ],
      nodeName: 'icon',
      nodeAttributes: ['src', 'width', 'height']
    },
    splash: {
      images: [
        { name: 'SplashScreenImage.png',  width: 768,   height: 1280 }
      ],
      nodeName: 'splash',
      nodeAttributes: ['src', 'width', 'height']
    }
  }

};

IonicResources.prototype.run = function() {
  buildPlatforms = [];
  images = [];
  generateQueue = [];
  sourceFiles = {};
  generatingImages = {};
  generateLandscape = false;
  generatePortrait = false;
  orientation = 'default';

  if (!fs.existsSync(ResSettings.configFile)) {
    console.error('Invalid ' + ResSettings.configFile + ' file. Make sure the working directory is a Cordova project.');
    return;
  }

  if(argv.default) {
    if(hasExistingResources() && !argv.force) {
      console.log('The resources folder already exists. We will not overwrite your files unless you pass the --force argument.'.red.bold);
      console.log('Running with the force flag will overwrite your resources directory and modify your config.xml file'.red.bold)
      return;
    }
    copyIconFilesIntoResources(argv.force)
    .then(function() {
      return addIonicIcons('ios')
    })
    .then(function() {
      return addIonicIcons('android');
    })
    .catch(function(error) {
      console.error('An error with adding default resources happened:', error);
    })
    return
  }

  if (!fs.existsSync(ResSettings.resourceDir)) {
    fs.mkdirSync(ResSettings.resourceDir);
  }

  var hasPlatforms = true;
  if (_.contains(argv._, 'ios')) {
    buildPlatforms.push('ios');

  } else if (_.contains(argv._, 'android')) {
    buildPlatforms.push('android');

  } else if (_.contains(argv._, 'wp8')) {
    buildPlatforms.push('wp8');

  } else if (!fs.existsSync('platforms')) {
    hasPlatforms = false;

  } else {
    buildPlatforms = fs.readdirSync('platforms');
    hasPlatforms = buildPlatforms.length;
  }

  if (!hasPlatforms) {
    console.error('No platforms have been added.');
    console.error('Please add a platform, for example: ionic platform add ios');
    console.error('Or provide a platform name, for example: ionic resources android');
    return;
  }

  getConfigData().then(function() {

    if (argv.landscape || argv.l) {
      generateLandscape = true;
    }
    if (argv.portrait || argv.p) {
      generatePortrait = true;
    }
    if (!argv.landscape && !argv.l && !argv.portrait && !argv.p) {

      orientation = getOrientationConfigData();
      if (orientation == 'landscape') {
        generateLandscape = true;
      } else if (orientation == 'portrait') {
        generatePortrait = true;
      } else {
        generateLandscape = true;
        generatePortrait = true;
      }
    }

    if (argv['api']) {
      ResSettings.apiUrl = argv['api'];
    }

    var promises = [];

    if (argv.icon || argv.i) {
      console.info('Ionic icon resources generator');
      promises.push(queueResTypeImages('icon'));

    } else if (argv.splash || argv.s) {
      console.info('Ionic splash screen resources generator');
      promises.push(queueResTypeImages('splash'));

    } else {
      console.info('Ionic icon and splash screen resources generator');
      promises.push(queueResTypeImages('icon'));
      promises.push(queueResTypeImages('splash'));
    }

    Q.all(promises)
      .then(loadSourceImages)
      .then(generateResourceImages)
      .then(loadResourceImages)
      .then(updateConfigData)
      .catch(console.error);

    IonicStats.t();

  });

};

function queueResTypeImages(resType) {
  var resTypePlatforms = {};

  return buildImagesData()
    .then(validateSourceImages)
    .then(queueResourceImages)
    .catch(console.error);

  function buildImagesData() {
    var deferred = Q.defer();

    buildPlatforms.forEach(function(platform) {
      if (!ResPlatforms[platform]) return;

      var platformResourceDir = path.join(ResSettings.resourceDir, platform);
      var resTypeDir = path.join(platformResourceDir, ResSettings[resType + 'Dir']);

      if (!fs.existsSync(platformResourceDir)) {
        fs.mkdirSync(platformResourceDir);
      }

      if (!fs.existsSync(resTypeDir)) {
        fs.mkdirSync(resTypeDir);
      }

      _.forEach(ResPlatforms[platform][resType].images, function(image) {
        var data = _.clone(image);
        _.extend(data, {
          platform: platform,
          src: path.join(resTypeDir, image.name),
          nodeName: ResPlatforms[platform][resType].nodeName,
          nodeAttributes: ResPlatforms[platform][resType].nodeAttributes,
          resType: resType
        });
        images.push(data);
      });
    });

    deferred.resolve();
    return deferred.promise;
  }

  function validateSourceImages() {
    var deferred = Q.defer();

    var validSourceFiles = _.map(ResSettings.sourceExtensions, function(ext) {
      return ResSettings[resType + 'SourceFile'] + '.' + ext;
    });

    images.forEach(function(image) {
      if (resTypePlatforms[image.platform]) return;
      resTypePlatforms[image.platform] = { platform: image.platform };
    });

    _.each(resTypePlatforms, function(resTypePlatform) {
      for (var x = 0; x < validSourceFiles.length; x++) {
        globalSourceFile = path.join(ResSettings.resourceDir, validSourceFiles[x]);
        platformSourceFile = path.join(ResSettings.resourceDir, resTypePlatform.platform, validSourceFiles[x]);

        if (fs.existsSync(platformSourceFile)) {
          resTypePlatform.sourceFilePath = platformSourceFile;
          resTypePlatform.sourceFilename = resTypePlatform.platform + '/' + validSourceFiles[x];
          break;

        } else if (fs.existsSync(globalSourceFile)) {
          resTypePlatform.sourceFilePath = globalSourceFile;
          resTypePlatform.sourceFilename = validSourceFiles[x];
          break;
        }
      }

      if (!resTypePlatform.sourceFilePath || sourceFiles[resTypePlatform.sourceFilePath]) return;

      sourceFiles[resTypePlatform.sourceFilePath] = {
        filePath: resTypePlatform.sourceFilePath,
        filename: resTypePlatform.sourceFilename
      };
    });

    var missingPlatformSources = _.filter(resTypePlatforms, function(resTypePlatform) {
      return !resTypePlatform.sourceFilePath;
    });

    if (missingPlatformSources.length) {
      var notFoundDirs = ['resources'];
      missingPlatformSources.forEach(function(missingPlatformSource) {
        notFoundDirs.push('resources/' + missingPlatformSource.platform);
      });

      var msg = resType + ' source file not found in ';
      if (notFoundDirs.length > 1) {
        msg += 'any of these directories: ' + notFoundDirs.join(', ');
      } else {
        msg += 'the resources directory';
      }

      console.error(msg);
      console.error('valid ' + resType + ' source files: ' + validSourceFiles.join(', '));
    }

    deferred.resolve();

    return deferred.promise;
  }

  function queueResourceImages() {
    var promises = [];

    _.each(resTypePlatforms, function(resTypePlatform) {

      if (!resTypePlatform.sourceFilePath) return;

      var deferred = Q.defer();
      promises.push(deferred.promise);

      fs.readFile(resTypePlatform.sourceFilePath, function(err, buf) {
        if (err) {
          deferred.reject('Error reading ' + resTypePlatform.sourceFilePath);

        } else {
          try {
            sourceFiles[resTypePlatform.sourceFilePath].imageId = crc.crc32(buf).toString(16);

            var resImages = _.filter(images, function(image) {
              return image.resType == resType;
            });

            resImages.forEach(function(image) {
              if (image.platform == resTypePlatform.platform) {
                image.sourceFilePath = resTypePlatform.sourceFilePath;

                var sourceFile = sourceFiles[image.sourceFilePath];
                var tmpFilename = sourceFile.imageId + '-' + image.width + 'x' + image.height + '.png';

                image.imageId = sourceFile.imageId;
                image.tmpPath = path.join(tmpDir, tmpFilename);

                if (resType == 'splash') {
                  if (!((image.width >= image.height && generateLandscape) || (image.height >= image.width && generatePortrait))) {
                    image.skip = true;
                    return;
                  }
                }

                if (ResSettings.cacheImages && fs.existsSync(image.tmpPath)) {
                  console.success(image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ') from cache');

                } else {
                  loadCachedSourceImageData(sourceFile);

                  if (sourceFile.cachedData && !sourceFile.cachedData.vector && (sourceFile.cachedData.width < image.width || sourceFile.cachedData.height < image.height)) {
                    image.skip = true;
                    console.error(image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ') skipped, source image ' + sourceFile.filename + ' (' + sourceFile.cachedData.width + 'x' + sourceFile.cachedData.height + ') too small');

                  } else {
                    sourceFile.upload = true;
                    generateQueue.push(image);
                  }
                }
              }
            });
            deferred.resolve();

          } catch (e) {
            deferred.reject('Error loading ' + resTypePlatform.sourceFilePath + ' md5: ' + e);
          }
        }
      });
    });

    return Q.all(promises);
  }

}

function loadSourceImages() {
  var promises = [];

  _.each(sourceFiles, function(sourceFile) {
    if (!sourceFile.upload) return;

    var deferred = Q.defer();

    console.log(' uploading ' + sourceFile.filename + '...');

    var postData = {
      url: ResSettings.apiUrl + ResSettings.apiUploadPath,
      formData: {
        image_id: sourceFile.imageId,
        src: fs.createReadStream(sourceFile.filePath),
        cli_version: moduleSettings.version
      },
      proxy: process.env.PROXY || null
    };

    request.post(postData, function(err, httpResponse, body) {
      function reject(msg) {
        try {
          msg += JSON.parse(body).Error;
        } catch (e) {
          msg += body || '';
        }
        deferred.reject(msg);
      }

      if (err) {
        var msg = 'Failed to upload source image: ';
        if (err.code == 'ENOTFOUND') {
          msg += 'requires network connection';
        } else {
          msg += err;
        }
        deferred.reject(msg);

      } else if (!httpResponse) {
        reject('Invalid http response');

      } else if (httpResponse.statusCode >= 500) {
        reject('Image server temporarily unavailable: ');

      } else if (httpResponse.statusCode == 404) {
        reject('Image server unavailable: ');

      } else if (httpResponse.statusCode > 200) {
        reject('Invalid upload: ');

      } else {
        try {
          var d = JSON.parse(body);
          sourceFile.width = d.Width;
          sourceFile.height = d.Height;
          sourceFile.vector = d.Vector;
          if (sourceFile.vector) {
            console.success(sourceFile.filename + ' (vector image) upload complete');
          } else {
            console.success(sourceFile.filename + ' (' + d.Width + 'x' + d.Height + ') upload complete');
          }

          cacheSourceImageData(sourceFile);
          deferred.resolve();

        } catch (e) {
          reject('Error parsing upload response: ');
        }
      }
    });
    promises.push(deferred.promise);
  });

  return Q.all(promises);
}

function cacheSourceImageData(sourceFile) {
  try {
    var data = JSON.stringify({
      width: sourceFile.width,
      height: sourceFile.height,
      vector: sourceFile.vector,
      version: 1
    });
    var cachedImagePath = path.join(tmpDir, sourceFile.imageId + '.json');
    fs.writeFile(cachedImagePath, data, function(err) {
      if (err) console.error('Error writing cacheSourceImageData: ' + err);
    });
  } catch (e) {
    console.error('Error cacheSourceImageData: ' + e);
  }
}

function loadCachedSourceImageData(sourceFile) {
  if (ResSettings.cacheImages && !sourceFile.cachedData && sourceFile.cachedData !== false) {
    try {
      var cachedImagePath = path.join(tmpDir, sourceFile.imageId + '.json');
      sourceFile.cachedData = JSON.parse(fs.readFileSync(cachedImagePath));
    } catch (e) {
      sourceFile.cachedData = false;
    }
  }
}


function generateResourceImages() {
  var deferred = Q.defer();

  // https://github.com/ferentchak/QThrottle
  var max = ResSettings.generateThrottle - 1;
  var outstanding = 0;

  function catchingFunction(value) {
    deferred.notify(value);
    outstanding--;

    if (generateQueue.length) {
      outstanding++;
      generateResourceImage(generateQueue.pop())
        .then(catchingFunction)
        .fail(deferred.reject);

    } else if (outstanding === 0) {
      deferred.resolve();
    }
  }

  if (generateQueue.length) {
    while (max-- && generateQueue.length) {
      generateResourceImage(generateQueue.pop())
        .then(catchingFunction)
        .fail(deferred.reject);
      outstanding++;
    }
  } else {
    deferred.resolve();
  }

  return deferred.promise;
}

function generateResourceImage(image) {
  var deferred = Q.defer();

  var sourceFile = sourceFiles[image.sourceFilePath];

  if (!sourceFile.vector && (sourceFile.width < image.width || sourceFile.height < image.height)) {
    image.skip = true;
    console.error(image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ') skipped, source image ' + sourceFile.filename + ' (' + sourceFile.width + 'x' + sourceFile.height + ') too small');
    deferred.resolve();

  } else if (generatingImages[image.tmpPath]) {
    console.success(image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ') generated');
    deferred.resolve();

  } else {
    console.log(' generating ' + image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ')...');
    generatingImages[image.tmpPath] = true;

    var postData = {
      url: ResSettings.apiUrl + ResSettings.apiTransformPath,
      formData: {
        image_id: image.imageId,
        name: image.name,
        platform: image.platform,
        width: image.width,
        height: image.height,
        res_type: image.resType,
        crop: 'center',
        encoding: 'png',
        cli_version: moduleSettings.version
      },
      proxy: process.env.PROXY || null
    };

    var wr = fs.createWriteStream(image.tmpPath, { flags: 'w' });
    wr.on("error", function(err) {
      console.error('Error copying to ' + image.tmpPath + ': ' + err);
      deferred.resolve();
    });
    wr.on("finish", function() {
      if (!image.skip) {
        console.success(image.resType + ' ' + image.platform + ' ' + image.name + ' (' + image.width + 'x' + image.height + ') generated');
        deferred.resolve();
      }
    });

    request.post(postData, function(err, httpResponse, body) {

      function reject(msg) {
        image.skip = true;
        try {
          delete generatingImages[image.tmpPath];
          wr.close();
          fs.unlink(image.tmpPath);
        } catch (err) {}

        try {
          msg += JSON.parse(body).Error;
        } catch (e) {
          msg += body || '';
        }
        deferred.reject(msg);
      }

      if (err || !httpResponse) {
        reject('Failed to generate image: ' + err);

      } else if (httpResponse.statusCode >= 500) {
        reject('Image transformation server temporarily unavailable: ');

      } else if (httpResponse.statusCode > 200) {
        reject('Invalid transformation: ');
      }
    })
    .pipe(wr);
  }

  return deferred.promise;
}

function loadResourceImages() {
  var promises = [];

  images.forEach(function(image) {
    if (!image.tmpPath || !fs.existsSync(image.tmpPath)) return;

    var deferred = Q.defer();
    promises.push(deferred.promise);

    var rd = fs.createReadStream(image.tmpPath);
    rd.on('error', function(err) {
      deferred.reject('Unable to read generated image: ' + err);
    });

    var wr = fs.createWriteStream(image.src, {flags: 'w'});
    wr.on('error', function(err) {
      deferred.reject('Unable to copy to ' + image.src + ': ' + err);
    });
    wr.on('finish', function() {
      image.isValid = true;
      deferred.resolve();
    });
    rd.pipe(wr);
  });

  return Q.all(promises);
}


function getConfigData() {
  var deferred = Q.defer();

  try {
    fs.readFile(ResSettings.configFile, onConfigRead);
  } catch (err) {
    console.error('Error saveConfigData: ' + err);
    deferred.reject();
  }

  function onConfigRead(err, data) {
    if (err) {
      console.error('Error reading config file: ' + err);
      deferred.reject();
      return;
    }

    try {
      var parser = new xml2js.Parser();
      parser.parseString(data, onXmlParse);
    } catch (e) {
      console.error('Error xml2js parseString: ' + e);
      deferred.reject();
    }
  }

  function onXmlParse(err, parsedData) {
    if (err) {
      console.error('Error parsing config file: ' + err);
      deferred.reject();
      return;
    }
    configData = parsedData;
    deferred.resolve(configData);
  }

  return deferred.promise;
}


function updateConfigData() {
  images = _.filter(images, function(image) {
    return image.isValid && !image.skip;
  });

  if (!images.length || !configData) return;

  var madeChanges = false;

  clearResourcesNodes();
  images.forEach(updateImageNode);
  buildDefaultIconNode();
  buildPreferenceSplashNodes();
  writeConfigData(configData);

  function clearResourcesNodes() {
    images.forEach(function(image) {
      if (!image) return;
      var platformConfigData = getPlatformConfigData(image.platform);
      if (platformConfigData && platformConfigData[image.resType]) {
        delete platformConfigData[image.resType];
        madeChanges = true;
      }
    });
  }

  function updateImageNode(image) {
    if (!image) return;

    if (!configData.widget.platform) {
      configData.widget.platform = [];
    }

    var platformConfigData = getPlatformConfigData(image.platform);

    if (!platformConfigData) {
      configData.widget.platform.push({ '$': { name: image.platform } });
      platformConfigData = getPlatformConfigData(image.platform);
    }

    if (!platformConfigData[image.nodeName]) {
      platformConfigData[image.nodeName] = [];
    }

    var node = getResourceConfigNode(platformConfigData, image.nodeName, image.src);
    if (!node) {
      node = { '$': {} };
      platformConfigData[image.nodeName].push(node);
      madeChanges = true;
    }

    image.nodeAttributes.forEach(function(nodeAttribute) {
      node.$[nodeAttribute] = image[nodeAttribute];
    });
  }

  function buildDefaultIconNode() {
    var currentSize = 0;
    var defaultIcon;

    images.forEach(function(image) {
      if (image && image.resType == 'icon' && image.width > currentSize && image.width <= ResSettings.defaultMaxIconSize) {
        currentSize = image.width;
        defaultIcon = image;
      }
    });

    if (defaultIcon) {
      configData.widget.icon = [{ '$': { src: defaultIcon.src } }];
      madeChanges = true;
    }
  }

  function buildPreferenceSplashNodes() {
    var hasAndroidSplash = _.find(images, function(image) {
      return image.platform == 'android' && image.resType == 'splash';
    });

    if (hasAndroidSplash) {
      if (!configData.widget.preference) {
        configData.widget.preference = [];
      }

      var hasScreenPref = _.find(configData.widget.preference, function(d) {
        return d && d.$ && d.$.name == 'SplashScreen';
      });
      if (!hasScreenPref) {
        configData.widget.preference.push({ '$': { name: 'SplashScreen', value: 'screen' } });
        madeChanges = true;
      }

      var hasDelayPref = _.find(configData.widget.preference, function(d) {
        return d && d.$ && d.$.name == 'SplashScreenDelay';
      });
      if (!hasDelayPref) {
        configData.widget.preference.push({ '$': { name: 'SplashScreenDelay', value: '3000' } });
        madeChanges = true;
      }
    }

  }

}

function getOrientationConfigData(platform) {
  if (configData.widget && configData.widget.preference) {
    var n = _.find(configData.widget.preference, function(d) {
      return d && d.$ && d.$.name && d.$.name.toLowerCase() == 'orientation';
    });
    if (n && n.$ && n.$.value) {
      return n.$.value.toLowerCase();
    }
  }
  return 'default';
}

function getPlatformConfigData(platform) {
  if (configData.widget && configData.widget.platform) {
    return _.find(configData.widget.platform, function(d) {
      return d && d.$ && d.$.name == platform;
    });
  }
}

function getResourceConfigNode(platformData, nodeName, src) {
  if (platformData[nodeName]) {
    return _.find(platformData[nodeName], function(d) {
      return d && d.$ && d.$.src == src;
    });
  }
}

function writeConfigData(configData) {
  // if (!madeChanges) return;

  try {
    var builder = new xml2js.Builder();
    var xmlString = builder.buildObject(configData);

    fs.writeFile(ResSettings.configFile, xmlString, function(err) {
      if (err) console.error('Error writing config data: ' + err);
    });
  } catch (e) {
    console.error('Error writeConfigData: ' + e);
  }
}

function addIonicIcons(platform, forceAddResources) {

  switch(platform) {
    case 'android':
    case 'ios':
      break;
    default:
      platform = 'android';//most likely crosswalk `cordova platform add ./engine/cordova-android`
  }

  try {
    var promise = null;

    if(forceAddResources) {
      console.log('forceAddResources')
      promise = copyIconFilesIntoResources(forceAddResources);
    } else {
      promise = Q();
    }

    return promise
    .then(getConfigData)
    .then(function(data) {
      if(!data.widget.platform || (data.widget.platform.length == 1 && data.widget.platform[0]['$'].name != platform)) {
        console.log('Adding icons for platform:'.blue.bold, platform.green)
        addPlatformIcons(platform, data)
        addSplashScreenPreferences(data)
        writeConfigData(data)
      }
    })
    .catch(function(error) {
      console.log('Error happened:', error)
      throw error;
    })
  } catch(ex) {
    Utils.fail(['Ionic CLI failed to add default Ionic resources - error', ex].join(''));
  }
}

function hasExistingResources() {
  //Check resources
  // resources/icon.png
  // resources/splash.png
  // resources/ios/
  // resources/android
  var hasResources = fs.existsSync(path.join('./', 'resources')),
      hasAndroidResources = fs.existsSync(path.join('./', 'resources', 'android')),
      hasIosResources = fs.existsSync(path.join('./', 'resources', 'ios')),
      hasIconResource = fs.existsSync(path.join('./', 'resources', 'icon.png')),
      hasSplashResource = fs.existsSync(path.join('./', 'resources', 'splash.png'));

  var hasAnyResources = hasResources || hasAndroidResources || hasIosResources || hasIconResource || hasSplashResource;

  return hasAnyResources;
}

function copyIconFilesIntoResources(forceAddResources) {
  var unzipPath = path.join('resources');

  if(hasExistingResources() && !forceAddResources) {
    // console.log('Not copying over default resources, the resources directory already exist. Please pass the --force argument to overwrite that folder'.red.bold);
    return Q();
  }

  var ionicResourcesUrl = 'https://github.com/driftyco/ionic-default-resources/archive/master.zip';
  // console.log('uzip to: ', unzipPath)
  console.log('Downloading Default Ionic Resources'.yellow);
  return Utils.fetchArchive(unzipPath, ionicResourcesUrl)
  .then(function() {
    shelljs.config.silent = true
    shelljs.mv('resources/ionic-default-resources-master/*', 'resources')
    shelljs.rm('-rf', 'resources/ionic-default-resources-master')
    console.log('Done adding default Ionic resources'.yellow)
  })
}

function addPlatformIcons(platform, configData) {
  var platElem = { '$': { name: platform }, icon: [], splash: [] };
  if(!configData.widget.platform) {
    configData.widget.platform = [];
  }

  configData.widget.platform.push(platElem);

  ResPlatforms[platform].icon.images.forEach(function(image) {
    var iconDir = ['resources/', platform, '/icon/', image.name].join('');
    if(platform == 'android') {
      platElem.icon.push({'$': { src: iconDir, density: image.density }})
    } else {
      platElem.icon.push({'$': { src: iconDir, width: image.width, height: image.height }})
    }
  });

  ResPlatforms[platform].splash.images.forEach(function(image) {
    //resources/ios/splash/
    var splashDir = ['resources/', platform, '/splash/', image.name].join('');
    if(platform == 'android') {
      platElem.splash.push({'$': { src: splashDir, density: image.density }})
    } else {
      platElem.splash.push({'$': { src: splashDir, height: image.height, width: image.width }})
    }
  })

  // generate.writeConfigData(configData);
}

function addSplashScreenPreferences(configData) {
  //Check for splash screen stuff
  //<preference name="SplashScreen" value="screen"/>
  //<preference name="SplashScreenDelay" value="3000"/>
  var preferences = configData.widget.preference;

  if(!configData.widget.preference) {
    configData.widget.preference = []
  }

  var hasSplashScreen = false, hasSplashScreenDelay = false;

  configData.widget.preference.forEach(function(pref) {
    if(pref.$.name == 'SplashScreen') {
      hasSplashScreen = true;
    }
    if(pref.$.name == 'SplashScreenDelay') {
      hasSplashScreenDelay = true;
    }
  })

  if(!hasSplashScreen) {
    configData.widget.preference.push({'$': { name: 'SplashScreen', value: 'screen'}});
  }
  if(!hasSplashScreenDelay) {
    configData.widget.preference.push({'$': { name: 'SplashScreenDelay', value: '3000'}});
  }
}

module.exports = {
  IonicTask: IonicResources,
  addIonicIcons: addIonicIcons,
  copyIconFilesIntoResources: copyIconFilesIntoResources,
  getConfigData: getConfigData,
  hasExistingResources: hasExistingResources,
  writeConfigData: writeConfigData
}
