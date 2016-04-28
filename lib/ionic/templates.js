require('colors');

var _ = require('underscore');
var Q = require('q');
var request = require('request');
var log = require('ionic-app-lib').logging.logger;

var TemplatesTask = {};

TemplatesTask.fetchStarterTemplates = function() {
  var self = this;

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
        q.reject('Error occured in download templates:', ex);
        self.ionic.fail(ex);
        return;
      }
      q.resolve(templatesJson);
    } else {
      log.error('Unable to fetch the starter templates. Please check your internet connection');
      q.reject(res);
    }
  });
  return q.promise;
};

TemplatesTask.list = function list(templates) {

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
};

TemplatesTask.run = function() {
  var self = this;

  self.fetchStarterTemplates()
  .then(function(starterTemplates) {
    var templates = _.sortBy(starterTemplates.items, function(template) { return template.name; });
    log.info('Ionic Starter templates'.green);
    self.list(templates);
  });

};

module.exports = TemplatesTask;
