// "cordovaPlatforms": [
//   "ios",
//   {
//     "android": {
//       "id": "android",
//       "locator": "https://github.com/apache/cordova-android.git"
//     }
//   }
// ],
// "cordovaPlugins": [
//   "org.apache.cordova.device",
//   "org.apache.cordova.console",
//   "com.ionic.keyboard",
//   "org.apache.cordova.splashscreen",
//   {
//     "locator": "https://github.com/MobileChromeApps/cordova-crosswalk-engine.git",
//     "id": "org.cordova.croswalk"
//   },
//   {
//     "locator": "/path/to/cloned/phonegap-facebook-plugin",
//     "id": "",
//     "variables": {
//         "APP_ID": "some_id",
//         "APP_NAME": "some_name"
//     }
//   }
// ]

var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Q = require('q'),
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicInfo = require('./info').IonicTask,
    IonicDocs = require('./resources/docs.json');

var Docs = module.exports

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

Docs.showTopics = function showTopics() {

}

Docs.list = function list() {
  try {
    var Table = require('cli-table');
    var docsList = IonicDocs.api;
    // var i = 0;
    console.log('Help Topics'.yellow)
    for (doc in docsList) {
      var table = new Table({ head: [doc] });
      var count = 0;
      var row = [];
      docsList[doc].docs.forEach(function(docItem) {
        if(count >= 7) {
          table.push(row)
          row = [];
          count = 0;
        }
        row.push(docItem)
        count++;
      })
      table.push(row)
      console.log(table.toString());
    }

  } catch (ex) {
    console.log('Error listing docs:', ex)
  }
  console.log('To open up a document, type "ionic docs <docname>" where the docname is listed above.'.blue.bold)
}

Docs.openDefault = function openDefault() {
  var open = require('open');
  var infoTask = require('./info').IonicTask;
  var info = new infoTask();


  var envInfo = info.gatherInfo();
  var ionicVersion = envInfo.ionic;
  var openUrl = ['http://ionicframework.com/docs/'];

  console.log('Ionic version:', ionicVersion);
  console.log('opening default')

  if(ionicVersion) {
    openUrl.push(ionicVersion, '/api')
  }

  open(openUrl.join(''));
}

Docs.lookUpCommand = function lookUpCommand(helpDoc) {
  // console.log('Going thru doc commands', helpDoc)
  //Go through all the different help topics
  var docsList = IonicDocs.api;
  helpDoc = helpDoc.replace(/-[a-z]/g, function(match) { return match[1].toUpperCase() })

  // console.log('Help doc:', helpDoc)

  var helpTopic;

  for(doc in docsList) {
    // console.log('Doc: ', doc)
    // console.log('Entries for doc', docsList[doc].docs)
    docsList[doc].docs.forEach(function(docItem) {
      // console.log('Doc Item:', docItem)
      if(docItem == helpDoc) {
        // console.log('We found the help doc:', helpDoc)
        helpTopic = doc;
      }
      if(docItem == '$' + helpDoc) {
        helpDoc = '%24' + helpDoc;
        helpTopic = doc
      }
    })
  }

  // console.log('we have helpTopic:', helpTopic)

  if(helpTopic) {
    // console.log('We have a help topic: ', helpTopic, helpDoc)
    var openUrl = ['http://ionicframework.com/docs/api/', helpTopic, '/', helpDoc].join('')
    console.log('Opening Ionic document:'.green.bold, openUrl.replace('%24', '$').green.bold)
    var open = require('open');
    open(openUrl);
  }
}

IonicTask.prototype.run = function run(ionic) {
  var self = this;
  this.ionic = ionic;
  // console.log('here')
  // console.log('Args: ', argv._);

  // console.log('IonicDocs:', IonicDocs)
  var docCmd = argv._[1];
  // console.log(docCmd)

  if(docCmd == 'list') {
    Docs.list();
  } else if(docCmd == '' || typeof docCmd == 'undefined') {
    console.log('openDefault')
    Docs.openDefault();
  } else {
    // console.log('look up command')
    //Look up what it was
    Docs.lookUpCommand(docCmd);
  }

  // switch(argv._[1]) {
  //   case 'list': 
  //     Docs.list()
  //     break;
  //   case '':
  //     Docs.restoreState();
  //     break;
  //   default:
  //     Docs.openDefault();
  //     break;
  // }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
