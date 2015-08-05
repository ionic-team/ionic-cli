
exports.ResSettings = {
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
  cacheImages: true,
  splashNodeName: 'splash',
  densityAttribute: 'density',
  platformElement: 'platform'
};

exports.getNode = function(name, width, height, density) {
  var node =  { name: name, width: width, height: height, density: density };
  if (density) {
    node[this.ResSettings.densityAttribute] = density;
  }
  return node;
};

exports.ResPlatforms = function() {
  return {
    android: {
      icon: {
        images: [
          this.getNode('drawable-ldpi-icon.png', 36, 36, "ldpi"),
          this.getNode('drawable-mdpi-icon.png', 48, 48, "ldpi"),
          this.getNode('drawable-hdpi-icon.png', 72, 72, "ldpi"),
          this.getNode('drawable-xhdpi-icon.png', 96, 96, "ldpi"),
          this.getNode('drawable-xxhdpi-icon.png', 144, 144, "ldpi"),
          this.getNode('drawable-xxxhdpi-icon.png', 192, 36, "ldpi")
        ],
        nodeName: 'icon',
        nodeAttributes: ['src', this.ResSettings.densityAttribute]
      },
      splash: {
        images: [
          this.getNode('drawable-land-ldpi-screen.png', 320, 240, "land-ldpi"),
          this.getNode('drawable-land-mdpi-screen.png', 480, 320, "land-mdpi"),
          this.getNode('drawable-land-hdpi-screen.png', 800, 480, "land-hdpi"),
          this.getNode('drawable-land-xhdpi-screen.png', 1280, 720, "land-xhdpi"),
          this.getNode('drawable-land-xxhdpi-screen.png', 1600, 960, "land-xxhdpi"),
          this.getNode('drawable-land-xxxhdpi-screen.png', 1920, 1280, "land-xxxhdpi"),
          this.getNode('drawable-port-ldpi-screen.png', 240, 320, "port-ldpi"),
          this.getNode('drawable-port-mdpi-screen.png', 320, 480, "port-mdpi"),
          this.getNode('drawable-port-hdpi-screen.png', 480, 800, "port-hdpi"),
          this.getNode('drawable-port-xhdpi-screen.png', 720, 1280, "port-xhdpi"),
          this.getNode('drawable-port-xxhdpi-screen.png', 960, 1600, "port-xxhdpi"),
          this.getNode('drawable-port-xxxhdpi-screen.png', 1280, 1920, "port-xxxhdpi")
        ],
        nodeName: this.ResSettings.splashNodeName,
        nodeAttributes: ['src', this.ResSettings.densityAttribute]
      }
    },

    ios: {
      icon: {
        images: [
          this.getNode('icon.png', 57, 57),
          this.getNode('icon@2x.png', 114, 114),
          this.getNode('icon-40.png', 40, 40),
          this.getNode('icon-40@2x.png', 80, 80),
          this.getNode('icon-50.png', 50, 50),
          this.getNode('icon-50@2x.png', 100, 100),
          this.getNode('icon-60.png', 60, 60),
          this.getNode('icon-60@2x.png', 120, 120),
          this.getNode('icon-60@3x.png', 180, 180),
          this.getNode('icon-72.png', 72, 72),
          this.getNode('icon-72@2x.png', 144, 144),
          this.getNode('icon-76.png', 76, 76),
          this.getNode('icon-76@2x.png', 152, 152),
          this.getNode('icon-small.png', 29, 29),
          this.getNode('icon-small@2x.png', 58, 58),
          this.getNode('icon-small@3x.png', 87, 87)
        ],
        nodeName: 'icon',
        nodeAttributes: ['src', 'width', 'height']
      },
      splash: {
        images: [
          this.getNode('Default-568h@2x~iphone.png', 640, 1136),
          this.getNode('Default-667h.png', 750, 1334),
          this.getNode('Default-736h.png', 1242, 2208),
          this.getNode('Default-Landscape-736h.png', 2208, 1242),
          this.getNode('Default-Landscape@2x~ipad.png', 2048, 1536),
          this.getNode('Default-Landscape~ipad.png', 1024, 768),
          this.getNode('Default-Portrait@2x~ipad.png', 1536, 2048),
          this.getNode('Default-Portrait~ipad.png', 768, 1024),
          this.getNode('Default@2x~iphone.png', 640, 960),
          this.getNode('Default~iphone.png', 320, 480)
        ],
        nodeName: this.ResSettings.splashNodeName,
        nodeAttributes: ['src', 'width', 'height']
      }
    },

    wp8: {
      icon: {
        images: [
          this.getNode('ApplicationIcon.png', 99, 99),
          this.getNode('Background.png', 159, 159)
        ],
        nodeName: 'icon',
        nodeAttributes: ['src', 'width', 'height']
      },
      splash: {
        images: [
          this.getNode('SplashScreenImage.png', 768, 1280)
        ],
        nodeName: this.ResSettings.splashNodeName,
        nodeAttributes: ['src', 'width', 'height']
      }
    }
  }

};
