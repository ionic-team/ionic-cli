'use strict';

var Q = require('q');
var rewire = require('rewire');
var templateUtils = rewire('../../lib/utils/templates');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var EOL = require('os').EOL;

describe('listTemplates method', function() {
  it('should should call fetchStarterTemplates pull out templates/sort and send to list', function(done) {
    var fetchStarterTemplatesRevert = templateUtils.__set__('fetchStarterTemplates', function() {
      return Q({
        items: [
          {
            name: 'A Template',
            description: 'A Description'
          },
          {
            name: 'C Template',
            description: 'C Description'
          },
          {
            name: 'B Template',
            description: 'B Description'
          }
        ]
      });
    });
    var listRevert = templateUtils.__set__('list', function(list) {
      return list;
    });
    templateUtils.listTemplates().then(function(list) {
      expect(list).toEqual([
        {
          name: 'A Template',
          description: 'A Description'
        },
        {
          name: 'B Template',
          description: 'B Description'
        },
        {
          name: 'C Template',
          description: 'C Description'
        }
      ]);
      fetchStarterTemplatesRevert();
      listRevert();
      done();
    });
  });

  it('should call fail fetchStarterTemplate throws', function(done) {
    var error = 'Something failed';
    var fetchStarterTemplatesRevert = templateUtils.__set__('fetchStarterTemplates', function() {
      return Q.reject(error);
    });
    templateUtils.listTemplates().catch(function(err) {
      expect(err).toEqual(error);
      fetchStarterTemplatesRevert();
      done();
    });
  });
});

describe('fetchStarterTemplates function', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  it('use request to gather templates and return a promise', function(done) {
    var templatesJson = {
      items: [
        {
          name: 'A Template',
          description: 'A Description'
        },
        {
          name: 'C Template',
          description: 'C Description'
        },
        {
          name: 'B Template',
          description: 'B Description'
        }
      ]
    };
    var templatesString = JSON.stringify(templatesJson);
    var revertRequest = templateUtils.__set__('request', function(options, callback) {
      callback(null, { statusCode: '200' }, templatesString);
    });
    var fetchStarterTemplates = templateUtils.__get__('fetchStarterTemplates');

    fetchStarterTemplates().then(function(templatesReturned) {
      expect(templatesReturned).toEqual(templatesJson);
      revertRequest();
      done();
    });
  });

  it('use request to gather templates and fail on invalid json', function(done) {
    var revertRequest = templateUtils.__set__('request', function(options, callback) {
      callback(null, { statusCode: '200' }, '{');
    });
    spyOn(log, 'error');
    var fetchStarterTemplates = templateUtils.__get__('fetchStarterTemplates');

    fetchStarterTemplates().catch(function() {
      expect(log.error).toHaveBeenCalled();
      revertRequest();
      done();
    });
  });

  it('use request to gather templates and fail on an response not equal to 200', function(done) {
    var revertRequest = templateUtils.__set__('request', function(options, callback) {
      callback(null, { statusCode: '400' }, null);
    });
    spyOn(log, 'error');
    var fetchStarterTemplates = templateUtils.__get__('fetchStarterTemplates');

    fetchStarterTemplates().catch(function() {
      expect(log.error).toHaveBeenCalled();
      revertRequest();
      done();
    });
  });
});

describe('list function', function() {

  it('on an response not equal to 200', function() {
    var templates = [
      {
        name: 'ionic-starter-a-template',
        description: 'A Description'
      },
      {
        name: 'ionic-starter-b-template',
        description: 'B Description'
      },
      {
        name: 'c-template',
        description: 'C Description'
      }
    ];
    spyOn(log, 'info');
    var list = templateUtils.__get__('list');

    list(templates);
    expect(log.info.calls[0].args).toEqual([EOL]);
    expect(log.info.calls[1].args[0]).toMatch('a-template'); // Use match because of colors
    expect(log.info.calls[1].args[1]).toEqual('...........');
    expect(log.info.calls[1].args[2]).toEqual(templates[0].description);
    expect(log.info.calls[2].args[0]).toMatch('b-template'); // Use match because of colors
    expect(log.info.calls[2].args[1]).toEqual('...........');
    expect(log.info.calls[2].args[2]).toEqual(templates[1].description);
    expect(log.info.calls[3].args[0]).toMatch('c-template'); // Use match because of colors
    expect(log.info.calls[3].args[1]).toEqual('...........');
    expect(log.info.calls[3].args[2]).toEqual(templates[2].description);
  });
});
