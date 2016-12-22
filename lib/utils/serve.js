var DEFAULT_ADDRESS = '0.0.0.0';
var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;

var Q = require('q');

function getUrl(address, port) {

  var platformName = require('os').platform();

  if ((platformName.indexOf('win') !== -1 && platformName !== 'darwin') &&
      (address === '0.0.0.0' || address.indexOf('0.0.0.0') !== -1)) {

    // Windows doesnt understand 0.0.0.0 - direct to localhost instead
    address = 'localhost';
  }

  return ['http://', address, ':', port].join('');
}

function findClosestOpenPort(host, port) {

  function t(portToCheck) {
    return isPortTaken(host, portToCheck).then(function(isTaken) {
      if (!isTaken) {
        return portToCheck;
      }
      return t(portToCheck + 1);
    });
  }

  return t(port);
}

function isPortTaken(host, port) {
  var deferred = Q.defer();
  var net = require('net');

  var tester = net.createServer()
  .once('error', function(err) {
    if (err.code !== 'EADDRINUSE') {
      return deferred.resolve(true);
    }
    deferred.resolve(true);
  })
  .once('listening', function() {
    tester.once('close', function() {
      deferred.resolve(false);
    })
    .close();
  })
  .listen(port, host);

  return deferred.promise;
}

module.exports = {
  DEFAULT_ADDRESS: DEFAULT_ADDRESS,
  DEFAULT_HTTP_PORT: DEFAULT_HTTP_PORT,
  DEFAULT_LIVE_RELOAD_PORT: DEFAULT_LIVE_RELOAD_PORT,
  getUrl: getUrl,
  isPortTaken: isPortTaken,
  findClosestOpenPort: findClosestOpenPort
};
