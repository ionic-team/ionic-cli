'use strict';

var IonicAppLib = require('ionic-app-lib');
var events = IonicAppLib.events;
var Q = require('q');
var Serve = IonicAppLib.serve;
var IonicProject = IonicAppLib.project;

var settings =  {
  title: 'serve',
  name: 'serve',
  summary: 'Start a local development server for app dev/testing',
  args: {
    '[options]': ''
  },
  options: {
    '--consolelogs|-c': {
      title: 'Print app console logs to Ionic CLI',
      boolean: true
    },
    '--serverlogs|-s': {
      title: 'Print dev server logs to Ionic CLI',
      boolean: true
    },
    '--port|-p': 'Dev server HTTP port (8100 default)',
    '--livereload-port|-r': 'Live Reload port (35729 default)',
    '--nobrowser|-b': {
      title: 'Disable launching a browser',
      boolean: true
    },
    '--nolivereload|-d': {
      title: 'Do not start live reload',
      boolean: true
    },
    '--noproxy|-x': {
      title: 'Do not add proxies',
      boolean: true
    },
    '--address': 'Use specific address or return with failure',
    '--all|-a': {
      title: 'Have the server listen on all addresses (0.0.0.0)',
      boolean: true
    },
    '--browser|-w': 'Specifies the browser to use (safari, firefox, chrome)',
    '--browseroption|-o': 'Specifies a path to open to (/#/tab/dash)',
    '--lab|-l': {
      title: 'Test your apps on multiple screen sizes and platform types',
      boolean: true
    },
    '--nogulp': {
      title: 'Disable running gulp during serve',
      boolean: true
    },
    '--platform|-t': 'Start serve with a specific platform (ios/android)'
  }
};

function run(ionicEnvironment, argv, rawCliArguments) {
  var log = ionicEnvironment.log;

  // Support `ionic lab` as a shortcut for `ionic serve --lab`
  var runsLab = rawCliArguments[0] === 'lab';
  if (runsLab) {
    argv.lab = true;
  }

  return runServer(argv, log)
    .catch(function(error) {
      log.error('There was an error serving your Ionic application:', error);
    });
}

function runServer(argv, log) {
  var project = null;
  var cwd = process.cwd();
  var options = {};
  var promise = Q();

  project = IonicProject.load(cwd);

  options = Serve.loadSettings(argv, project);
  options.appDirectory = cwd; // called from cli - ionic serve - cwd is this
  options.nogulp = argv.nogulp;

  // check if CONNECT_LIVE_RELOAD_PORT is defined and use that instead
  if (process.env.CONNECT_LIVE_RELOAD_PORT) {
    options.liveReloadPort = process.env.CONNECT_LIVE_RELOAD_PORT;
  }

  if (argv.all || argv.a) {
    options.address = '0.0.0.0';
  } else if (argv.address) {
    options.address = argv.address;
  } else {
    promise = Serve.getAddress(options);
  }

  return promise
  .then(function() {
    return Serve.checkPorts(true, options.port, options.address, options);
  })
  .then(function() {
    if (options.runLivereload) {
      return Serve.checkPorts(false, options.liveReloadPort, options.address, options);
    }
  })
  .then(function() {
    return Serve.start(options);
  })
  .then(function() {
    return Serve.showFinishedServeMessage(options);
  })
  .then(function() {
    events.on('serverlog', log.info);
    events.on('consolelog', log.info);
  });
}

module.exports = Object.assign(settings, {
  run: run
});
