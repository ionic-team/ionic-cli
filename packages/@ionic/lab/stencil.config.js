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
    { src: '../../node_modules/@ionic-internal/ionic-ds/www/assets/fonts', dest: 'assets/fonts' },
  ],
};

exports.devServer = {
  root: 'www',
  watchGlob: 'src/**/*',
}
