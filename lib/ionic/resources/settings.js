
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
  cacheImages: true
};


exports.ResPlatforms = {

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
