var fs = require('fs'),
    path = require('path'),
    IonicProject = require('./project');

var transformCookies = function transformCookies(jar) {
  return jar.map(function(c) {
    return c.key + "=" + encodeURIComponent(c.value);
  }).join("; ");
}

var retrieveCsrfToken = function retrieveCsrfToken(jar) {
  // console.log('retrieveCsrfToken', jar)
  if(!jar || typeof jar == 'undefined' || jar.length == 0) {
    // console.log('no jar folks')
    return '';
  }
  var csrftoken = '';
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      csrftoken = jar[i].value;
      break;
    }
  }
  return csrftoken;
}

var deleteFolderRecursive = function(removePath) {
  var fs = require('fs'),
      path = require('path')

  if( fs.existsSync(removePath) ) {
    fs.readdirSync(removePath).forEach(function(file,index){
      var curPath = path.join(removePath, file);
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(removePath);
  }
};

//https://github.com/apache/cordova-lib/blob/master/cordova-lib/src/cordova/util.js#L91
function findIonicRoot(dir) {
  if (!dir) {
    var pwd = process.env.PWD;
    var cwd = process.cwd();
    if (pwd && pwd != cwd && pwd != 'undefined') {
      return this.findIonicRoot(pwd) || this.findIonicRoot(cwd);
    }
    return this.findIonicRoot(cwd);
  }
  for (var i = 0; i < 1000; ++i) {
    if (fs.existsSync(path.join(dir, IonicProject.PROJECT_FILE))) {
      return dir; 
    }

    var parentDir = path.normalize(path.join(dir, '..'));
    // Detect fs root.
    if (parentDir == dir) {
        return null;
    }
    dir = parentDir;
  }
  console.error('Hit an unhandled case in utils.findIonicRoot');
  return false;
}

function cdIonicRoot() {
  var rootDir = this.findIonicRoot();
  if (!rootDir) {
    throw new Error('Couldn\'t find ' + IonicProject.PROJECT_FILE + ' file. Are you in an Ionic project?');
  }
  process.env.PWD = rootDir;
  process.chdir(rootDir);
  return rootDir;
}

module.exports = {
  deleteFolderRecursive: deleteFolderRecursive,
  retrieveCsrfToken: retrieveCsrfToken,
  transformCookies: transformCookies,
  findIonicRoot: findIonicRoot,
  cdIonicRoot: cdIonicRoot
}
