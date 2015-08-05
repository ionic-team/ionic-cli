var IonicAppLib = require('ionic-app-lib'),
    Login = IonicAppLib.login,
    Package = IonicAppLib.package,
    LoginTask = require('./login'),
    Task = require('./task').Task;

var Project = IonicAppLib.project;
var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {

  if (argv._.length < 2) {
    return ionic.fail("Specify a valid platform (android or ios).", 'package')
  }

  var dir = null,
      project = null,
      appId = null,
      platform = argv._[1],
      buildMode = argv.release ? 'release' : 'debug';

  try {
    dir = process.cwd();
    project = Project.load(dir);
    appId = project.get('app_id');
  } catch (ex) {
    return Utils.fail(ex.message);
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        console.log('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(jar) {
      Package.doPackage(appId, dir, jar, platform, buildMode);
    })
    .catch(function(ex) {
      Utils.fail(ex);
    });

};

exports.IonicTask = IonicTask;
