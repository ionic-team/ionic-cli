var prompt = require('prompt');
var Q = require('q');

var Prompt = module.exports;

Prompt.prompt = function(schema, argv) {
  var q = Q.defer();
  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();
  prompt.get(schema, function(err, result) {
    if (err) {
      if (err.message === 'canceled') {
        return q.reject(false);
      } else {
        return q.reject(err);
      }
    }

    return q.resolve(result);
  });
  return q.promise;
};
