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
  ],
};

exports.devServer = {
  root: 'www',
  watchGlob: 'src/**/*',
}
