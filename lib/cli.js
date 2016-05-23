var Cli = module.exports,
    colors = require('colors'),
    IonicAppLib = require('ionic-app-lib'),
    ConfigXml = IonicAppLib.configXml,
    IonicStore = require('./ionic/store').IonicStore,
    IonicConfig = new IonicStore('ionic.config'),
    Info = IonicAppLib.info,
    Ionitron = require('./ionic/ionitron'),
    optimist = require('optimist'),
    path = require('path'),
    settings = require('../package.json'),
    Tasks = require('./tasks/cliTasks'),
    Utils = IonicAppLib.utils,
    logging = IonicAppLib.logging,
    Q = require('q'),
    semver = require('semver');

Cli.Tasks = TASKS = Tasks;

Cli.IONIC_DASH = 'https://apps.ionic.io';
//Cli.IONIC_DASH = 'http://localhost:8000';
Cli.IONIC_API = '/api/v1/';
Cli.PRIVATE_PATH = '.ionic';


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

    Cli.setUpConsoleLoggingHelpers();
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
      logging.logger.level = 'debug';
    }

    if(argv.help || argv.h) {
      return Cli.printHelpLines();
    }

    if(argv['stats-opt-out']) {
      IonicConfig.set('statsOptOut', true);
      IonicConfig.save();
      console.log('Successful stats opt-out');
      return;
    }

    var taskSetting = Cli.tryBuildingTask(argv);
    if(!taskSetting) {
      return Cli.printAvailableTasks();
    }

    var booleanOptions = Cli.getBooleanOptionsForTask(taskSetting);

    argv = optimist(processArgv.slice(2)).boolean(booleanOptions).argv;

    var taskModule = Cli.lookupTask(taskSetting.module);
    var taskInstance = new taskModule();
    var promise = taskInstance.run(Cli, argv);
    return promise;
  } catch (ex) {
    logging.logger.debug('Cli.Run - Error', ex);
    return Utils.fail(ex);
  }
};

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

Cli.setUpConsoleLoggingHelpers = function setUpConsoleLoggingHelpers() {
  colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    small: 'grey',
    verbose: 'cyan',
    prompt: ['yellow', 'bold'],
    info: 'white',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
  });

  var consoleInfo = console.info;
  console.info = function() {
    if (arguments.length === 1 && !arguments[0]) return;
    var msg = '';
    for (var n in arguments) {
      msg += arguments[n] + ' ';
    }
    consoleInfo.call(console, msg.blue.bold);
  };

  var consoleError = console.error;
  console.error = function() {
    if (arguments.length === 1 && !arguments[0]) return;
    var msg = ' ✗';
    for (var n in arguments) {
      msg += ' ' + arguments[n];
    }
    consoleError.call(console, msg.red.bold);
  };

  console.success = function() {
    if (arguments.length === 1 && !arguments[0]) return;
    var msg = ' ✓';
    for (var n in arguments) {
      msg += ' ' + arguments[n];
    }
    console.log(msg.green.bold);
  };

  //Default level is set to 'info'
  IonicAppLib.logging.createDefaultLogger();
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
    if (settings.version.indexOf('beta') > -1) {
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
  console.log(settings.version + '\n');
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

        process.stdout.write('\n+---------------------------------------------------------+\n');

        var monthMessage = ['+ Extra! Extra! Fresh Ionic updates for ', monthNames[d.getMonth()], ' ', d.getFullYear(), '\n+\n'].join('').bold;
        process.stdout.write(monthMessage);

        for(var i = 0, j = messagesJson.list.length; i < j; i++) {
          var entry = messagesJson.list[i];
          var entryMessage = ['+ ', entry.name, '\n', '+ ', entry.action.yellow, '\n+\n'].join('');
          process.stdout.write(entryMessage);
        }
        process.stdout.write('+---------------------------------------------------------+\n\n');
      } catch(ex) {
        console.log('ex', ex.stack);
        q.reject('Error occurred in downloading the CLI messages:', ex)
        Utils.fail(ex);
        q.reject(ex);
        return
      }
      q.resolve(messagesJson);
    } else {
      process.stdout.write('Unable to fetch', err, res.statusCode);
      q.reject(res);
    }
  });
  return q.promise;
};

//A little why on this reportExtras here -
//We need to access the CLI's package.json file
//for that, we need the path to be relative to this,
//not the node_module/ionic-app-lib directory
Cli.reportExtras = function reportExtras(err) {
  var commandLineInfo = process.argv;
  var info = Cli.gatherInfo();
  info.command = commandLineInfo;
  return info;
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
      logging.logger.debug('Cli.Utils.errorHandler msg', msg, typeof msg);
      var stack = typeof msg == 'string' ? '' : msg.stack;
      var errorMessage = typeof msg == 'string' ? msg : msg.message;
      // console.log('stack', stack, arguments.caller);
      if (msg) {
        var info = Cli.gatherInfo();
        var ionicCliVersion = info.ionic_cli;
        process.stderr.write('\n' + stack.error.bold + '\n\n');
        process.stderr.write(errorMessage.error.bold);
        process.stderr.write( (' (CLI v' + ionicCliVersion + ')').error.bold + '\n');

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

Cli.setConfigXml = function setConfigXml(settings) {
  return ConfigXml.setConfigXml(process.cwd(), settings);
};

Cli.doRuntimeCheck = function doRuntimeCheck(version) {
  var lastVersionChecked = IonicConfig.get('lastVersionChecked');
  var versionHasBeenChecked;

  try {
    versionHasBeenChecked = semver.satisfies(version, lastVersionChecked);
  } catch (ex) {
    console.log(ex);
  }

  if (!lastVersionChecked || !versionHasBeenChecked) {
    Info.checkRuntime();
    IonicConfig.set('lastVersionChecked', version);
    IonicConfig.save();
  }
};
