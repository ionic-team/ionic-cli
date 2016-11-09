var DEFAULT_ADDRESS = '0.0.0.0';
var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;

function getUrl(address, port) {
  
  var platformName = require('os').platform();

  if ((platformName.indexOf('win') !== -1 && platformName !== 'darwin') &&
      (address === '0.0.0.0' || address.indexOf('0.0.0.0') !== -1)) {

    // Windows doesnt understand 0.0.0.0 - direct to localhost instead
    address = 'localhost';
  }

  return ['http://', address, ':', port].join('');
}

module.exports = {
  DEFAULT_ADDRESS: DEFAULT_ADDRESS,
  DEFAULT_HTTP_PORT: DEFAULT_HTTP_PORT,
  DEFAULT_LIVE_RELOAD_PORT: DEFAULT_LIVE_RELOAD_PORT,
  getUrl: getUrl
};