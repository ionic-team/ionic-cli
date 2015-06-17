var fs = require('fs'),
    cheerio = require('cheerio'),
    path = require('path'),
    parseUrl = require('url').parse,
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    Task = require('./task').Task,
    IonicLoginTask = require('./login').IonicTask;

var IonicTask = function() {};

var CONFIG_FILE = './www/lib/ionic-service-core/ionic-core-settings.json';
var INDEX_FILE = './www/index.html';
var APP_FILE = './www/js/app.js';

IonicTask.prototype = new Task();

IonicTask.prototype.writeIoConfig = function writeIoConfig(key, val, set) {
  fs.readFile(CONFIG_FILE, function(err, data) {
    if (err) {
      console.log("ERROR: ", err);
    } else {
      var jsonObj = JSON.parse(data);
      if (set) {
        jsonObj[key] = val
      } else if (!set && jsonObj[key]) {
        delete jsonObj[key]
      }
      fs.writeFile(CONFIG_FILE, JSON.stringify(jsonObj), function(error) {
        if (err) {
          console.log("ERROR: ", error);
        } else {
          console.log("Successfully saved " + key );
        }
      });
    }
  });
};

IonicTask.prototype.run = function(ionic) {
  var self = this;
  self.ionic = ionic;

  self.project = null;

  try {
    self.project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
    return
  }

  var set = false,
      key = '',
      val = '';

  if (argv['_'][1] == 'set' || argv['_'][1] == 'unset') {
    if (argv['_'][1] == 'set') {
      set = true;
    }
    if (argv['_'][2]) {
      key = argv['_'][2];
      if (argv['_'][3] && set) {
        val = argv['_'][3];
      }
    } else {
      self.ionic.fail("Invalid syntax, use 'ionic config <command> key value'");
    }
  } else {
    self.ionic.fail("Invalid command, must use 'set' or 'unset'");
  }

  this.writeIoConfig(key, val, set);
};

exports.injectIoComponent = function(set, path, name) {
  fs.readFile(INDEX_FILE, function(err, data) {
    if (err) {
      console.log("ERROR: ", err);
      console.log("Have you run 'ionic add ionic-service-core' yet?");
    } else {
      var exists = false;
      var coreScript = false;
      $ = cheerio.load(data);
      $("script").each(function() {
        if ($(this).attr('src') === "lib/ionic-service-core/ionic-core.js") {
          coreScript = this;
        }
        if (!set && $(this).attr('src') === path) {
          console.log("Deleting component from index.html");
          $(this).remove();
        } else if (set && $(this).attr('src') === path) {
          exists = true;
        }
      });
      if (set && !exists) {
        console.log('Adding component to index.html');
        var newScript = "\n<script src='" + path + "'></script>";
        if (coreScript) {
          $(coreScript).after(newScript);
        } else {
          $('head').append(newScript);
        }
      }
      fs.writeFile(INDEX_FILE, $.html(), function(error) {
        if (err) {
          console.log("ERROR: ", error);
        }
      });
    }
  });

  fs.readFile(APP_FILE, function(err, data) {
    if (err) {
      console.log("ERROR: ", err);
      console.log("Is your app declaration contained in 'app.js'?");
    } else {
      if (set) {
        var jsFile = String(data);
        console.log('injecting ' + name + ' into "app.js"');
        jsFile = jsFile.replace("\'ionic.service.core\',", "\'ionic.service.core\'," + "\'" + name + "\',");
        jsFile = jsFile.replace('\"ionic.service.core\",', '\"ionic.service.core\",' + "\'" + name + "\',");
      } else {
        console.log('removing ' + name + ' from "app.js"');
        jsFile = jsFile.replace("\'" + name + "\',", '');
        jsFile = jsFile.replace('\"' + name + '\",', '');
      }
      fs.writeFile(APP_FILE, jsFile, function(error) {
        if (err) {
          console.log("ERROR: ", error);
        }
      });
    }
  });
};

exports.IonicTask = IonicTask;
