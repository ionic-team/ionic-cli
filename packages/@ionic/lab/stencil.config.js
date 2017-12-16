exports.config = {
  namespace: 'ionlab',
  srcDir: 'src/stencil',
  serviceWorker: false,
  bundles: [
    { components: ['ionlab-app', 'ionlab-platform-dropdown'] }
  ],
  copy: [
    { src: 'assets' },
  ],
};

exports.devServer = {
  root: 'www',
  watchGlob: 'src/**/*',
}
