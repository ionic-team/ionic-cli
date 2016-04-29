require('shelljs/global');
require('colors');

var _ = require('underscore');
var fs = require('fs');
var Q = require('q');
var listTemplates = require('../utils/templates').listTemplates;
var IonicAppLib = require('ionic-app-lib');
var Start = IonicAppLib.start;
var log = IonicAppLib.logging.logger;
var Utils = IonicAppLib.utils;
var fail = IonicAppLib.utils.fail;

var settings = {
  title: 'start',
  name: 'start',
  summary: 'Starts a new Ionic project in the specified PATH',
  args: {
    '[options]': 'any flags for the command',
    '<PATH>': 'directory for the new project',
    '[template]': 'Starter templates can either come from a named template, \n' +
                  '(ex: tabs, sidemenu, blank),\n' +
                  'a Github repo, a Codepen url, or a local directory.\n' +
                  'Codepen url, ex: http://codepen.io/ionic/pen/odqCz\n' +
                  'Defaults to Ionic "tabs" starter template'
  },
  options: {
    '--appname|-a': 'Human readable name for the app (Use quotes around the name)',
    '--id|-i': 'Package name for <widget id> config, ex: com.mycompany.myapp',
    '--skip-npm': {
      title: 'Skip npm package installation',
      boolean: true
    },
    '--no-cordova|-w': {
      title: 'Create a basic structure without Cordova requirements',
      boolean: true
    },
    '--sass|-s': {
      title: 'Setup the project to use Sass CSS precompiling',
      boolean: true
    },
    '--list|-l': {
      title: 'List starter templates available',
      boolean: true
    },
    '--io-app-id': 'The Ionic.io app ID to use',
    '--template|-t': 'Project starter template',
    '--v2|-v': {
      boolean: true,
      title: 'Start a Ionic v2 project'
    },
    '--typescript|--ts': {
      boolean: true,
      title: '(with --v2 only) Use TypeScript in starter'
    },
    '--zip-file|-z': 'URL to download zipfile for starter template'
  },
  disableChangePwd: true
};

function run(ionic, argv) {
  if (argv.list || argv.l) {
    return listTemplates();
  }

  if (argv._.length < 2) {
    return fail('Invalid command', 'start');
  }

  if (argv._[1] === '.') {
    log.error('Please name your Ionic project something meaningful other than \'.\''.red);
    return;
  }

  var promptPromise;
  var options = Utils.preprocessCliOptions(argv);
  var startingApp = true;

  // Grab the app's relative directory name
  if (fs.existsSync(options.targetPath)) {
    promptPromise = Start.promptForOverwrite(options.targetPath);
  } else {
    promptPromise = Q(true);
  }

  return promptPromise
  .then(function(promptToContinue) {
    if (!promptToContinue) {
      startingApp = false;
      log.info('\nIonic start cancelled by user.');
      return;
    }
    return Start.startApp(options);
  })
  .then(function() {
    if (startingApp) {
      return Start.printQuickHelp(options);
    }
  })
  .then(function() {
    if (startingApp) {
      return Start.promptLogin(options);
    }
  })
  .then(function() {
    if (options.v2 && startingApp) {
      log.info('\nNew to Ionic? Get started here: http://ionicframework.com/docs/v2/getting-started\n');
    }
  })
  .catch(function(error) {
    log.error(error);
    throw error;
  });
}

module.exports = _.extend(settings, {
  run: run
});
