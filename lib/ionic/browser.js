// Deprecated
'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle

var settings = {
  title: 'browser',
  name: 'browser',
  summary: 'Add another browser for a platform ' + '(beta)'.yellow,
  args: {
    '<command>': '"add remove rm info versions upgrade list ls revert"',
    '[browser]': 'The browser you wish to add or remove (Crosswalk)'
  },
  options: {
    '--nosave|-n': {
      title: 'Do not save the platforms and plugins to the package.json file',
      boolean: true
    }
  },
  module: './ionic/browser',
  isProjectTask: true
};

function run() {
  console.log(
    'The browser task has been deprecated.\n' +
    'Please use the Cordova Crosswalk plugin instead:\n\n' +
    'ionic platform add android\n' +
    'ionic plugin add cordova-plugin-crosswalk-webview\n'
  );
}

module.exports = extend(settings, {
  run: run
});
