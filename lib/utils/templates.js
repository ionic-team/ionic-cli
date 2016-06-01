require('colors');

var _ = require('underscore');
var Q = require('q');
var request = require('request');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

function fetchStarterTemplates() {

  // log.info('About to fetch template');
  var downloadUrl = 'http://code.ionicframework.com/content/starter-templates.json';

  // log.info('\nDownloading Starter Templates'.bold, downloadUrl, starterTemplateJsonPath);
  log.info('\nDownloading Starter Templates'.bold, '-', downloadUrl);

  var q = Q.defer();

  var proxy = process.env.PROXY || null;
  request({ url: downloadUrl, proxy: proxy }, function(err, res, html) {
    if (!err && res && parseInt(res.statusCode, 10) === 200) {
      var templatesJson = {};
      try {
        templatesJson = JSON.parse(html);
      } catch (ex) {
        log.error('ex', ex);
        return q.reject('Error occured in download templates:', ex);
      }
      return q.resolve(templatesJson);
    } else {
      log.error('Unable to fetch the starter templates. Please check your internet connection');
      return q.reject(res);
    }
  });
  return q.promise;
}

function list(templates) {

  // Should have array of [{ name: 'name', description: 'desc' }]
  log.info('\n');
  _.each(templates, function(template) {
    var rightColumn = 20;
    var dots = '';
    var shortName = template.name.replace('ionic-starter-', '');

    while ((shortName + dots).length < rightColumn + 1) {
      dots += '.';
    }
    log.info(shortName.green, dots, template.description);
  });
}

function listTemplates() {

  return fetchStarterTemplates()
    .then(function(starterTemplates) {
      var templates = _.sortBy(starterTemplates.items, function(template) { return template.name; });
      log.info('Ionic Starter templates'.green);
      return list(templates);
    });
}

module.exports = {
  listTemplates: listTemplates
};
