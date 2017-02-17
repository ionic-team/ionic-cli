'use strict';

var chalk = require('chalk');
var prompt = require('prompt');
var _ = require('underscore');
var extend = require('../utils/extend');
var IonicDocs = require('./resources/docs.json');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var COLUMN_LIMIT = 3;

var settings = {
  title: 'docs',
  name: 'docs',
  summary: 'Opens up the documentation for Ionic',
  args: {
    '<TOPIC>': 'the topic to view help documentation for. Use "ls" to view all topics'
  },
  isProjectTask: false
};

function sanitizeUrl(url) {
  return url.replace(/\$/g, '%24');
}

function list() {
  try {
    var Table = require('cli-table');
    var docsList = IonicDocs.api;

    // var i = 0;
    log.info(chalk.yellow('Help Topics'));
    _.each(docsList, function(doc) {
      var table = new Table({ head: [doc.id] });
      var count = 0;
      var row = [];
      _.each(doc.docs, function(docItem) {
        var addDoc = docItem.replace('$', '');
        if (count >= COLUMN_LIMIT) {
          table.push(row);
          row = [];
          count = 0;
        }
        row.push(addDoc);
        count += 1;
      });
      table.push(row);
      log.info(table.toString());
    });

  } catch (ex) {
    log.error('Error listing docs:', ex);
  }
  log.info(chalk.blue.bold('Type "ionic docs <docname>" to open the help document for that doc.'));
}

function openDefault() {
  var Info = IonicAppLib.info;

  var envInfo = Info.gatherInfo();
  var ionicVersion = envInfo.ionic;

  var url = 'http://ionicframework.com/docs/';
  if (ionicVersion) {
    url += ionicVersion + '/api';
    log.info('Ionic version:', ionicVersion);
  }
  return require('open')(sanitizeUrl(url));
}

function lookUpCommand(helpDoc) {

  // log.info('Going thru doc commands', helpDoc)
  // Go through all the different help topics
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

  var match = _.find(docs, { doc: helpDoc }) || _.find(docs, { doc: '$' + helpDoc });
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
      .sort(function(a, b) {
        return a.doc.length < b.doc.length ? -1 : 1;
      })
      .slice(0, 3);

    if (matches.length === 0) return log.info('No matching docs found for "' + helpDoc.cyan + '".');

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
      default: matches.length === 1 ? 'yes' : '1'
    }, function(err, result) {
      if (err) {
        throw err;
      }
      var num;
      if (matches.length === 1) {
        if (result.choice.match(/^y/i, result.choice.trim())) {
          num = 1;
        }
      } else {
        num = parseInt(result.choice.trim());
      }
      if (!isNaN(num) && num > 0 && num <= matches.length) {
        num -= 1; // chioce (1-based) to index (0-based)
        return openDoc(matches[num].topic, matches[num].doc);
      }
    });

  }

  function openDoc(topic, doc) {
    var url = sanitizeUrl('http://ionicframework.com/docs/api/' + topic + '/' + doc);
    log.info(chalk.green.bold('Opening Ionic document:'), chalk.green.bold(url));
    return require('open')(url);
  }
}

function run(ionic, argv) {
  var docCmd = argv._[1];

  if (docCmd === 'ls') {
    list();
  } else if (!docCmd) {

    openDefault();
  } else {

    // log.info('look up command', docCmd)
    // Look up what it was
    lookUpCommand(docCmd);
  }
}

module.exports = extend(settings, {
  list: list,
  openDefault: openDefault,
  lookUpCommand: lookUpCommand,
  run: run
});
