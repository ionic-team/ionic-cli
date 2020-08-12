const { dirname } = require('path');

exports.config = {
  srcDir: 'src/stencil',
  outputTargets: [
    {
      type: 'www',
      serviceWorker: false,
    },
  ],
  copy: [
    { src: 'assets' },
    { src: dirname(require.resolve('@ionic-internal/ionic-ds/package')) + '/www/assets/fonts', dest: 'assets/fonts' },
  ],
};

exports.devServer = {
  root: 'www',
  watchGlob: 'src/**/*',
}
