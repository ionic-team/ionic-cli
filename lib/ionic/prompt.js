var prompt = require('prompt')
    Q = require('q');

var Prompt = module.exports;

Prompt.promptUserPromise = function promptUserPromise(schema) {
  var q = Q.defer();
  var prompt = require('prompt');
  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();
  prompt.get(schema, function (err, result) {
    if (err && err.message !== 'canceled') {
      q.reject(err);
      return ionic.fail('Error getting Facebook app information: ' + err);
    } else {
      return q.resolve(false);
    }
    q.resolve(result);
  });
  return q.promise;
};
