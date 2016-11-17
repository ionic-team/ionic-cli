'use strict';

var Q = require('q');
var path = require('path');
var fs = require('fs');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var DEV_SERVER_COMPLETION_STRING = 'dev server running';

function getScriptName(name) {
  return 'ionic:' + name;
}


function hasIonicScript(name) {
  return getPackageJsonContents().then(function(packageJsonContents) {
    return packageJsonContents.hasOwnProperty('scripts') && 
           packageJsonContents.scripts.hasOwnProperty(getScriptName(name));
  });
}

function runIonicScript(name, argv) {
  var spawn = require('cross-spawn-async');  
  var scriptName = getScriptName(name);
  var q = Q.defer();

  process.env['FORCE_COLOR'] = true;
  var scriptSpawn = spawn('npm', ['run', scriptName, '--'].concat(argv || []), {
    stdio: [process.stdin, 'pipe', process.stderr]
  })
    .on('error', function(err) {
      log.debug('Spawn command', scriptName, 'failed');
      q.reject('Unable to run spawn command ' + err);
    });
  
  scriptSpawn.stdout.pipe(process.stdout);

  scriptSpawn.stdout.on('data', function(data) {
    var dataLines = data.toString().split('\n').find(function(line) {
      return line.indexOf(DEV_SERVER_COMPLETION_STRING) > -1;
    });
    if (dataLines && dataLines.length > 0) {
      return q.resolve();
    }
  });
  
  scriptSpawn.on('exit', function(code) {
    log.debug('Spawn command', scriptName, 'completed');
    if (code !== 0) {
      return q.reject('There was an error with the spawned command: ' + name);
    }
    return q.resolve();
  });

  // If this process ends ensure that we killed the spawned child
  process.on('exit', function() {
    scriptSpawn.kill();
  });
  
  return q.promise;
}

/**
 * Function is memoized so that it should only access the filesystem one time.
 * Everytime after that it just returns the saved packageJson wrapped in a resolved promise.
 */
var getPackageJsonContents = (function() {
  var packageJson;

  return function f() {
    var packageJsonPath = path.resolve(process.cwd() + '/package.json');
    var q = Q.defer();

    if (packageJson) {
      return Q.resolve(packageJson);
    }

    try {
      fs.readFile(packageJsonPath, 'utf8', function(err, dataString) {
        if (!err) {
          packageJson = JSON.parse(dataString);
        }
        q.resolve(packageJson);
      });
    } catch (e) {
      q.resolve(packageJson);
    }

    return q.promise;
  };
})();

module.exports = {
  getPackageJsonContents: getPackageJsonContents,
  hasIonicScript: hasIonicScript,
  runIonicScript: runIonicScript
};
