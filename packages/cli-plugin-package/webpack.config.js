var webpack = require('webpack');
var CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
var path = require('path');

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
  externals: {
    '@ionic/cli-utils': '@ionic/cli-utils',
    '@ionic/app-scripts': '@ionic/app-scripts'
  },
  devtool: 'sourcemap',
  node: {
    __filename: false,
    __dirname: false
  }
};
