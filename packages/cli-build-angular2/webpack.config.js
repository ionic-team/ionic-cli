var webpack = require('webpack');
var CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
var path = require('path');
var packageJSON = require('./package.json');
var nodeModules = Object.keys(Object.assign({},packageJSON.dependencies, packageJSON.peerDependencies))
  .reduce((all, mod) => {
    all[mod] = mod;
    return all;
  }, {});

module.exports = {
  entry: {
    index: './src/index.ts'
  },

  module: {
    loaders: [
      {
        test: /\.ts$/,
        loaders: ['awesome-typescript-loader']
      },
      {
        test: /\.json$/,
        loaders: ['json-loader']
      }
    ]
  },

  resolve: {
    mainFields: ['main'],
    extensions: ['.js', '.ts', '.json']
  },

  plugins: [
    new CheckerPlugin()
  ],

  target: 'node',

  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs'
  },
  externals: nodeModules,
  devtool: 'sourcemap',
  node: {
    __filename: false,
    __dirname: false
  }
};
