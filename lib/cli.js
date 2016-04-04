var Cli = module.exports,
    colors = require('colors'),
    IonicAppLib = require('ionic-app-lib'),
    ConfigXml = IonicAppLib.configXml,
    IonicStats = require('./ionic/stats').IonicStats,
    IonicStore = require('./ionic/store').IonicStore,
    IonicConfig = new IonicStore('ionic.config'),
    Info = IonicAppLib.info,
    IonicProject = IonicAppLib.project,
    Ionitron = require('./ionic/ionitron'),
    optimist = require('optimist'),
    path = require('path'),
    fs = require('fs'),
    settings = require('../package.json'),
    Tasks = require('./tasks/cliTasks'),
    Utils = IonicAppLib.utils,
    Logging = IonicAppLib.logging,
    log = Logging.logger,
    Q = require('q'),
    semver = require('semver'),
    gutil = require('gulp-util'),
    prettyTime = require('pretty-hrtime');

Cli.Tasks = TASKS = Tasks;

Cli.IONIC_DASH = 'https://apps.ionic.io';
//Cli.IONIC_DASH = 'http://localhost:8000';
Cli.IONIC_API = '/api/v1/';
Cli.PRIVATE_PATH = '.ionic';

// This is where the logger for the app-lib can be configured (or replaced).
log.level = 'info';


// Cli.dev = function dev() {
//   if (settings.version.contains('dev') || settings.version.contains('beta') || settings.version.contains('alpha')) {
//     return true;
//   }
//   return false;
// };

// The main entry point for the CLI
// This takes the process.argv array for arguments
// The args passed should be unfiltered.
// From here, we will filter the options/args out
// using optimist. Each command is responsible for
// parsing out the args/options in the way they need.
// This way, we can still test with passing in arguments.
Cli.run = function run(processArgv) {
  try {
    //First we parse out the args to use them.
    //Later, we will fetch the command they are trying to
    //execute, grab those options, and reparse the arguments.
    var argv = optimist(processArgv.slice(2)).argv;

    Cli.attachErrorHandling();
    Cli.checkLatestVersion();

    process.on('exit', function(){
      Cli.printVersionWarning();
    });

    //Before taking any more steps, lets check their
    //environment and display any upgrade warnings
    Cli.doRuntimeCheck(settings.version);

    if ((argv.version || argv.v) && !argv._.length) {
      return Cli.version();
    }

    if(argv.ionitron) {
      var lang = argv.es ? 'es' : 'en';
      return Ionitron.print(lang);
    }

    if (argv.verbose) {
      log.level = 'debug';
    }

    if(argv.help || argv.h) {
      return Cli.printHelpLines();
    }

    if(argv['stats-opt-out']) {
      IonicConfig.set('statsOptOut', true);
      IonicConfig.save();
      log.info('Successful stats opt-out');
      return;
    } else {
      IonicStats.t();
    }

    var taskSetting = Cli.tryBuildingTask(argv);
    if(!taskSetting) {
      return Cli.printAvailableTasks();
    }
    log.debug('Task setting:', taskSetting);
    var booleanOptions = Cli.getBooleanOptionsForTask(taskSetting);
    argv = optimist(processArgv.slice(2)).boolean(booleanOptions).argv;
    var taskModule = Cli.lookupTask(taskSetting.module);
    var taskInstance = new taskModule();

    //this should be tracked by each task
    if (!taskSetting.disableChangePwd) {
      var root = Utils.cdIonicRoot();
      var project = IonicProject.load(root);
      argv.v2 = project && project.get('v2');
      argv.v2 && log.debug('Ionic 2 project.');

      if (fs.existsSync('node_modules')) {
        //run with gulp hooks
        return runWithGulp(argv, taskInstance);
      } else if (argv.v2) {
        log.warn('WARN: No node_modules directory found, do you need to run npm install?'.yellow);
      }
    }
    return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv);

  } catch (ex) {
    return Utils.fail(ex);
  }
};

function runWithGulp(argv, taskInstance){
  var cmdName = argv._[0];
  var beforeHook = cmdName + ':before';
  var afterHook = cmdName + ':after';

  if (loadGulpfile()) {
    log.verbose('Gulpfile found');

    try {
      var gulp = require(path.resolve(process.cwd() + '/node_modules/gulp'));
    } catch(e) {
      // Empty gulpfile (or one that doesn't require gulp?), and no gulp
      log.error('\nGulpfile detected, but gulp is not installed'.red);
      log.error('Do you need to run `npm install`?\n'.red);
      process.exit(1);
    }
    logEvents(gulp, [beforeHook, afterHook]);

    if (gulp.tasks[beforeHook]) {
      log.info('\nRunning \'' + beforeHook + '\' gulp task before ' + cmdName);
    }
    return Q.nfcall(gulp.start.bind(gulp), beforeHook).then(
      function(){
        // Only some commands return promises, so wrap it
        return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv);
      },
      function(e){ //task error, let gulp handle it
        //if there is no hook task, but it's a v2 app and a command that usually needs a hook
        if (e.missingTask && /serve|build|run|emulate|upload/.test(cmdName) && argv.v2) {
          var taskName = (cmdName === 'serve') ? 'watch' : 'build';
          log.warn(('WARN: No \'' + beforeHook + '\' gulp task found!').yellow);

          //The task exists, but there are no hooks for it
          //They have the old config file, so we're safe to yell at them
          //With new config, may intentionally not have hooks if running their own build
          if (gulp.tasks[taskName] && fs.existsSync('ionic.config.js')) {
            log.info(('Your gulpfile contains a \'' + taskName + '\' task already! Add:\n').cyan)
            log.info(('    gulp.task(\'' + cmdName + ':before\', [\'' + taskName + '\']);\n').cyan);
            log.info(('to your gulpfile to have Ionic CLI run \'' + taskName + '\' before ' + cmdName + '.\n').cyan);
          } else {
            log.warn(('If your app requires a build step, you may want to ensure it runs before ' + cmdName + '.\n').yellow);
          }
        }
        // Only some commands return promises, so wrap it
        return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv);
      }
    ).then(function(){
      if (gulp.tasks[afterHook]) {
        log.info('\nRunning \'' + afterHook + '\' gulp task after ' + cmdName);
      }
      return Q.nfcall(gulp.start.bind(gulp), afterHook);
    });
  }

  //No gulpfile
  if (/serve|build|run|emulate|upload/.test(cmdName) && argv.v2) {
    log.warn('WARN: No gulpfile found!');
    log.warn('If your app requires a build step, you may want to ensure it runs before ' + cmdName + '.\n');

    if (fs.existsSync('ionic.config.js')) {
      var inquirer = require('inquirer');
      var deferred = Q.defer();

      log.info('Looks like you are using the deprecated ionic.config.js and have no gulpfile!');
      log.info('As of beta.21 the Ionic CLI relies on gulp hooks to build your web assets\n');
      inquirer.prompt([{
        type: 'confirm',
        name: 'downloadGulp',
        message: 'Would you like to download the default gulpfile?'.cyan,
      }],
      function(answers){
        answers.downloadGulp ? deferred.resolve() : deferred.reject();
      });
      var downloadGulp = false;
      return deferred.promise.then(
        function() {
          downloadGulp = true;
          return downloadDefaultGulpfile(cmdName).then(
            installGulpfilePackages,
            function(err) {
              log.error('There was an error downloading the default gulpfile: ' + err);
              process.exit(1);
            }
          ).then(
            function(){
              log.info('Npm packages installed successfully. Try running \'' + cmdName + '\' again.');
            },
            function(){
              log.warn('There was an error installing the packages required by the gulpfile.');
              log.warn('You\'ll need to install the following packages manually: ');
              log.warn('    ' + requires.join(' '));
            }
          );
        },
        function() {
          return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv);
        }
      );
    }
  }

  return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv);
}

function loadGulpfile(){
  //TODO add babel support?
  var names = ['gulpfile.js', 'Gulpfile.js'];
  for (var i = 0, ii = names.length; i < ii; i++) {
    try {
      require(path.resolve(process.cwd() + '/' + names[i]));
      return true;
    } catch(e){
      if (e.code === 'MODULE_NOT_FOUND') {
        if (e.message.indexOf(names[i]) === -1) {
          log.info('Uh oh! Looks like you\'re missing a module in your gulpfile:');
          log.error(e.message);
          log.info('\nDo you need to run `npm install`?\n');
          process.exit(1);
        } else {
          // ignore missing gulpfile
          continue
        }
      }
      log.error('There is an error in your gulpfile: ')
      log.error(e.stack);
      process.exit(1);
    }
  }
  return false;
}

function downloadDefaultGulpfile(){
  var https = require('https');
  var fileStream = fs.createWriteStream('gulpfile.js');
  var deferred = Q.defer();
  var project = IonicProject.load();
  var branch = project.get('typescript') ? 'typescript' : 'master';
  var url = 'https://raw.githubusercontent.com/driftyco/ionic2-app-base/' + branch + '/gulpfile.js';

  log.info('\nDownloading default gulpfile from: ' + url);

  fileStream.on('open', function () {
    https.get(url, function (res) {
      res.on('error', function (err) {
        deferred.reject(err);
      });

      res.pipe(fileStream);
    });
  }).on('error', function (err) {
    deferred.reject(err);
  }).on('finish', function () {
    deferred.resolve();
  });

  return deferred.promise;
}

function installGulpfilePackages(cmdName){
  var detective = require('detective');
  var requires = detective(fs.readFileSync('gulpfile.js'));
  var deferred = Q.defer();

  log.info('Successfully downloaded gulpfile.\n'.green);
  log.info('Now installing npm packages used by the gulpfile: ');
  log.info('    ' + requires.join(' ') + '\n');

  var npmInstall = require('child_process').spawn('npm', ['install', '--save-dev'].concat(requires));
  npmInstall.stdout.on('data', function(data){ log.debug(data) });
  npmInstall.stderr.on('data', function(data){ log.debug(data) });
  npmInstall.on('error', function(err) {
    log.error('Error in gulp npm install: ' + err.stack);
  });
  npmInstall.on('exit', function(code) {
    code !== 0 ? deferred.reject() : deferred.resolve();
  });

  return deferred.promise;
}


function logEvents(gulpInst, finalTaskNames) {
  gulpInst.on('task_start', function(e) {
    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    gutil.log('Starting', '\'' + e.task.cyan + '\'...');
  });

  gulpInst.on('task_stop', function(e) {
    var time = prettyTime(e.hrDuration);
    gutil.log(
      'Finished', '\'' + e.task.cyan + '\'',
      'after', time.magenta
    );
    if (finalTaskNames.indexOf(e.task) > -1) {
      log.info();
    }
  });

  gulpInst.on('task_err', function(e) {
    var msg = formatGulpError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log(
      '\'' + e.task.cyan + '\'',
      'errored after'.red,
      time.magenta
    );
    gutil.log(msg);
  });

  // gulpInst.on('task_not_found', function(err) {
  //   gutil.log(
  //     ('Task \'' + err.task + '\' is not in your gulpfile').red
  //   );
  //   gutil.log('Please check the documentation for proper gulpfile formatting');
  //   process.exit(1);
  // });
}

// Format orchestrator errors
function formatGulpError(e) {
  if (!e.err) {
    return e.message;
  }

  // PluginError
  if (typeof e.err.showStack === 'boolean') {
    return e.err.toString();
  }

  // Normal error
  if (e.err.stack) {
    return e.err.stack;
  }

  // Unknown (string, number, etc.)
  return new Error(String(e.err)).stack;
}

Cli.getBooleanOptionsForTask = function getBooleanOptionsForTask(task) {
  var availableTaskOptions = task.options;
  var booleanOptions = [];

  if (availableTaskOptions) {
    for (var key in availableTaskOptions) {
      if (typeof availableTaskOptions[key] == 'string') {
        continue;
      }
      var optionWithPipe = key;
      var optionsSplit = optionWithPipe.split('|');
      booleanOptions.push(optionsSplit[0].substring(2));
      if (optionsSplit.length == 2) {
        booleanOptions.push(optionsSplit[1].substring(1));
      }
    }
  }

  return booleanOptions;
};

Cli.lookupTask = function lookupTask(module) {
  try {
    var taskModule = require(module).IonicTask;
    return taskModule;
  } catch (ex) {
    throw ex;
  }
};

Cli.printVersionWarning = function printVersionWarning() {
  if (settings.version.indexOf('beta') > -1 || settings.version.indexOf('alpha') > -1) {
    return;
  }

  if (Cli.npmVersion && Cli.npmVersion != settings.version.trim()) {
    process.stdout.write('\n------------------------------------\n'.red);
    process.stdout.write('Ionic CLI is out of date:\n'.bold.yellow);
    process.stdout.write( (' * Locally installed version: ' + settings.version + '\n').yellow );
    process.stdout.write( (' * Latest version: ' + Cli.npmVersion + '\n').yellow );
    process.stdout.write( (' * https://github.com/driftyco/ionic-cli/blob/master/CHANGELOG.md\n').yellow );
    process.stdout.write( ' * Run '.yellow + 'npm install -g ionic'.bold + ' to update\n'.yellow );
    process.stdout.write('------------------------------------\n\n'.red);
    Cli.npmVersion = null;
  }
};

Cli.checkLatestVersion = function checkLatestVersion() {
  Cli.latestVersion = Q.defer();

  try {
    if (settings.version.indexOf('beta') > -1 || settings.version.indexOf('alpha') > -1) {
      // don't bother checking if its a beta
      Cli.latestVersion.resolve();
      return;
    }

    var versionCheck = IonicConfig.get('versionCheck');
    if (versionCheck && ((versionCheck + 86400000) > Date.now() )) {
      // we've recently checked for the latest version, so don't bother again
      Cli.latestVersion.resolve();
      return;
    }

    var proxy = process.env.PROXY || process.env.http_proxy || null;
    var request = require('request');
    request({ url: 'http://registry.npmjs.org/ionic/latest', proxy: proxy }, function(err, res, body) {
      try {
        Cli.npmVersion = JSON.parse(body).version;
        IonicConfig.set('versionCheck', Date.now());
        IonicConfig.save();
      } catch(e) {}
      Cli.latestVersion.resolve();
    });
  } catch (e) {
    Cli.latestVersion.resolve();
  }

  return Cli.latestVersion.promise;
};

Cli.tryBuildingTask = function tryBuildingTask(argv) {
  if (argv._.length === 0) {
    return false;
  }
  var taskName = argv._[0];

  return Cli.getTaskWithName(taskName);
};

Cli.getTaskWithName = function getTaskWithName(name) {
  for (var i = 0; i < TASKS.length; i++) {
    var t = TASKS[i];
    if(t.name === name) {
      return t;
    }
    if (t.alt) {
      for(var j = 0; j < t.alt.length; j++) {
        var alt = t.alt[j];
        if (alt === name) {
          return t;
        }
      }
    }
  }
};

Cli.printIonic = function printIonic() {
  var w = function(s) {
    process.stdout.write(s);
  };

  w('  _             _     \n');
  w(' (_)           (_)     \n');
  w('  _  ___  _ __  _  ___ \n');
  w(' | |/ _ \\| \'_ \\| |/ __|\n');
  w(' | | (_) | | | | | (__ \n');
  w(' |_|\\___/|_| |_|_|\\___|  CLI v'+ settings.version + '\n');
};

Cli.printAvailableTasks = function printAvailableTasks(argv) {
  Cli.printIonic();
  process.stderr.write('\nUsage: ionic task args\n\n=======================\n\n');

  if (process.argv.length > 2) {
    process.stderr.write( (process.argv[2] + ' is not a valid task\n\n').bold.red );
  }

  process.stderr.write('Available tasks: '.bold);
  process.stderr.write('(use --help or -h for more info)\n\n');

  for (var i = 0; i < TASKS.length; i++) {
    var task = TASKS[i];
    if (task.summary) {
      var name = '   ' + task.name + '  ';
      var dots = '';
      while ((name + dots).length < 20) {
        dots += '.';
      }
      process.stderr.write(name.green.bold + dots.grey + '  ' + task.summary.bold + '\n');
    }
  }

  process.stderr.write('\n');
  Cli.processExit(1);
};

Cli.printHelpLines = function printHelpLines() {
  Cli.printIonic();
  process.stderr.write('\n=======================\n');

  for (var i = 0; i < TASKS.length; i++) {
    var task = TASKS[i];
    if (task.summary) {
      Cli.printUsage(task);
    }
  }

  process.stderr.write('\n');
  Cli.processExit(1);
};

Cli.printUsage = function printUsage(d) {
  var w = function(s) {
    process.stdout.write(s);
  };

  w('\n');

  var rightColumn = 45;
  var dots = '';
  var indent = '';
  var x, arg;

  var taskArgs = d.title;

  for(arg in d.args) {
    taskArgs += ' ' + arg;
  }

  w(taskArgs.green.bold);

  while( (taskArgs + dots).length < rightColumn + 1) {
    dots += '.';
  }

  w(' ' + dots.grey + '  ');

  if(d.summary) {
    w(d.summary.bold);
  }

  for(arg in d.args) {
    if( !d.args[arg] ) continue;

    indent = '';
    w('\n');
    while(indent.length < rightColumn) {
      indent += ' ';
    }
    w( (indent + '    ' + arg + ' ').bold );

    var argDescs = d.args[arg].split('\n');
    var argIndent = indent + '    ';

    for(x=0; x<arg.length + 1; x++) {
      argIndent += ' ';
    }

    for(x=0; x<argDescs.length; x++) {
      if(x===0) {
        w( argDescs[x].bold );
      } else {
        w( '\n' + argIndent + argDescs[x].bold );
      }
    }
  }

  indent = '';
  while(indent.length < d.name.length + 1) {
    indent += ' ';
  }

  var optIndent = indent;
  while(optIndent.length < rightColumn + 4) {
    optIndent += ' ';
  }

  for(var opt in d.options) {
    w('\n');
    dots = '';

    var optLine = indent + '[' + opt + ']  ';

    w(optLine.yellow.bold);

    if(d.options[opt]) {
      while( (dots.length + optLine.length - 2) < rightColumn) {
        dots += '.';
      }
      w(dots.grey + '  ');

      var taskOpt = d.options[opt],
          optDescs;

      if (typeof taskOpt == 'string') {
        optDescs = taskOpt.split('\n');
      } else {
        optDescs = taskOpt.title.split('\n');
      }
      for(x=0; x<optDescs.length; x++) {
        if(x===0) {
          w( optDescs[x].bold );
        } else {
          w( '\n' + optIndent + optDescs[x].bold );
        }
      }
    }
  }

  w('\n');
};

Cli.processExit = function processExit(code) {
  if (Cli.cliNews && Cli.cliNews.promise) {
    Q.all([Cli.latestVersion.promise, Cli.cliNews.promise])
    .then(function() {
      process.exit(code);
    })
  } else {
    Cli.latestVersion.promise.then(function() {
      process.exit(code);
    })
  }
};

Cli.version = function version() {
  log.info(settings.version + '\n');
};

Cli.printNewsUpdates = function printNewsUpdates(skipNewsCheck) {
  if(typeof skipNewsCheck == 'undefined') {
    skipNewsCheck = true;
  }

  var q = Cli.cliNews = Q.defer();
  var proxy = process.env.PROXY || null;

  var request = require('request');
  var monthNames = [ "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December" ];
  var d = new Date();

  var downloadUrl = 'http://code.ionicframework.com/content/cli-message.json';
  request({ url: downloadUrl, proxy: proxy }, function(err, res, html) {
    if(!err && res && res.statusCode === 200) {
      try {
        var newsId = IonicConfig.get('newsId');
        messagesJson = JSON.parse(html);
        if(skipNewsCheck || typeof newsId == 'undefined' || newsId != messagesJson.id) {
          IonicConfig.set('newsId', messagesJson.id);
          IonicConfig.save();
        } else {
          q.resolve();
          return q.promise;
        }

        process.stdout.write('+---------------------------------------------------------+\n');

        var monthMessage = ['+ Extra! Extra! Ionic Updates for ', monthNames[d.getMonth()], ' ', d.getFullYear(), '\n+\n'].join('');
        process.stdout.write(monthMessage);

        for(var i = 0, j = messagesJson.list.length; i < j; i++) {
          var entry = messagesJson.list[i];
          var entryMessage = ['+ ', entry.name, '\n', '+ ', entry.action.blue.bold, '\n+\n'].join('');
          process.stdout.write(entryMessage);
        }
        process.stdout.write('+---------------------------------------------------------+\n'.green);
      } catch(ex) {
        q.reject('Error occurred in downloading the CLI messages:', ex)
        Utils.fail(ex);
      }
      q.resolve(messagesJson);
    } else {
      process.stdout.write('Unable to fetch', err, res.statusCode);
      q.reject(res);
    }
  });
  return q.promise;
};

Cli.gatherInfo = function gatherInfo() {
  var info = Info.gatherInfo();
  Info.getIonicVersion(info, process.cwd());
  Info.getIonicCliVersion(info, path.join(__dirname, '../'));
  return info;
};

Cli.handleUncaughtExceptions = function handleUncaughtExceptions(err, url) {
  console.log('An uncaught exception occurred and has been reported to Ionic'.error.bold);
  var errorMessage = typeof err === 'string' ? err : err.message;
  Utils.errorHandler(errorMessage);
  process.exit(1);
};

Cli.attachErrorHandling = function attachErrorHandling() {
  Utils.errorHandler = function errorHandler(msg, taskHelp) {
    try {
      log.debug('Cli.Utils.errorHandler msg', msg, typeof msg);
      var stack = typeof msg == 'string' ? '' : msg.stack;
      var errorMessage = typeof msg == 'string' ? msg : msg.message;
      if (msg) {
        var info = Cli.gatherInfo();
        var ionicCliVersion = info.ionic_cli;
        if (stack && stack.length > 0) {
          process.stderr.write('\n' + stack.bold + '\n\n');
        }
        process.stderr.write('\n' + errorMessage.bold);
        process.stderr.write( (' (CLI v' + ionicCliVersion + ')').bold + '\n');

        Info.printInfo(info);
      }
      process.stderr.write('\n');
      process.exit(1);
      return '';
    } catch (ex) {
      console.log('errorHandler had an error', ex)
      console.log(ex.stack);
    }
  };

  //TODO Attach error reporter here
};

//Backwards compatability for those commands that havent been
//converted yet.
Cli.fail = function fail(err, taskHelp) {
  // var error = typeof err == 'string' ? new Error(err) : err;
  Utils.fail(err, taskHelp);
};

Cli.getContentSrc = function getContentSrc() {
  return Utils.getContentSrc(process.cwd());
};

Cli.doRuntimeCheck = function doRuntimeCheck(version) {
  var lastVersionChecked = IonicConfig.get('lastVersionChecked');
  var versionHasBeenChecked;

  try {
    versionHasBeenChecked = semver.satisfies(version, lastVersionChecked);
  } catch (ex) {
    log.info(ex);
  }

  if (!lastVersionChecked || !versionHasBeenChecked) {
    Info.checkRuntime();
    IonicConfig.set('lastVersionChecked', version);
    IonicConfig.save();
  }
};
