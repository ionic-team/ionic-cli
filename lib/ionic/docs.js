var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Q = require('q'),
    prompt = require('prompt'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicInfo = require('./info').IonicTask,
    IonicDocs = require('./resources/docs.json'),
    COLUMN_LIMIT = 3;


var Docs = module.exports;

var IonicTask = function() {};

IonicTask.prototype = new Task();

function sanitizeUrl(url) {
  return url.replace(/\$/g, '%24');
}

Docs.list = function list() {
  try {
    var Table = require('cli-table');
    var docsList = IonicDocs.api;
    // var i = 0;
    console.log('Help Topics'.yellow);
    _.each(docsList, function(doc) {
      var table = new Table({ head: [doc.id] });
      var count = 0;
      var row = [];
      _.each(doc.docs, function(docItem) {
        var addDoc = docItem.replace('$', '');
        if(count >= COLUMN_LIMIT) {
          table.push(row);
          row = [];
          count = 0;
        }
        row.push(addDoc);
        count++;
      });
      table.push(row);
      console.log(table.toString());
    });

  } catch (ex) {
    console.log('Error listing docs:', ex);
  }
  console.log('Type "ionic docs <docname>" to open the help document for that doc.'.blue.bold);
};

Docs.openDefault = function openDefault() {
  var Info = require('ionic-app-lib').info;

  var envInfo = Info.gatherInfo();
  var ionicVersion = envInfo.ionic;

  var url = 'http://ionicframework.com/docs/';
  if (ionicVersion) {
    url += ionicVersion + '/api';
    console.log('Ionic version:', ionicVersion);
  }
  return require('open')(sanitizeUrl(url));
};

Docs.lookUpCommand = function lookUpCommand(helpDoc) {
  // console.log('Going thru doc commands', helpDoc)
  //Go through all the different help topics
  var docsList = IonicDocs.api;
  helpDoc = helpDoc.replace(/-[a-zA-Z]/g, function(match) { 
    return match[1].toUpperCase(); 
  });

  var docs = _.map(docsList, function(doc) {
    return _.map(doc.docs, function(docItem) {
      return {
        topic: doc.id,
        doc: docItem
      };
    });
  });
  docs = _.flatten(docs);

  var match = _.find(docs, { doc: helpDoc }) || _.find(docs, { doc: '$' + helpDoc});
  if (match) {
    return openDoc(match.topic, match.doc);
  
  } else if (helpDoc.length >= 3) {

    var lowerHelp = helpDoc.toLowerCase();
    var matches = docs
      .filter(function(item) {
        var lowerDoc = item.doc.toLowerCase();
        return lowerDoc.indexOf(lowerHelp) > -1 ||
          lowerHelp.indexOf(lowerDoc) > -1;
      })
      .sort(function(a,b) {
        return a.doc.length < b.doc.length ? -1 : 1;
      })
      .slice(0,3);

    if (matches.length === 0) return console.log('No matching docs found for "' + helpDoc.cyan + '".');

    prompt.message = 'Did you mean ';
    if (matches.length > 1) {
      prompt.message += matches.map(function(item, i) {
        var str = '';
        if (i > 0) {
          if (i === matches.length - 1)  {
            str = ' or ';
          } else {
            str = ', ';
          }
        }
        str += '(' + (i + 1 + '').cyan + ') ' + item.doc;
        return str;
      }).join('');
    } else {
      prompt.message += matches[0].doc;
    }
    prompt.message += '?';
    prompt.start();
    prompt.get({
      name: 'choice',
      default: matches.length === 1 ? 'yes' : '1',
    }, function(err, result) {
      var num;
      if (matches.length == 1) {
        if (result.choice.match(/^y/i, result.choice.trim())) {
          num = 1;
        }
      } else {
        num = parseInt(result.choice.trim());
      }
      if (!isNaN(num) && num > 0 && num <= matches.length) {
        num--; // chioce (1-based) to index (0-based)
        return openDoc(matches[num].topic, matches[num].doc);
      }
    });

  }

  function openDoc(topic, doc) {
    var url = sanitizeUrl('http://ionicframework.com/docs/api/' + topic + '/' + doc);
    console.log('Opening Ionic document:'.green.bold, url.green.bold);
    return require('open')(url);
  }
};

IonicTask.prototype.run = function run(ionic) {
  var self = this;
  this.ionic = ionic;

  var docCmd = argv._[1];
  // console.log('docCmd', docCmd);

  if(docCmd == 'ls') {
    Docs.list();
  } else if (!docCmd) {
    // console.log('openDefault')
    Docs.openDefault();
  } else {
    // console.log('look up command', docCmd)
    //Look up what it was
    Docs.lookUpCommand(docCmd);
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
