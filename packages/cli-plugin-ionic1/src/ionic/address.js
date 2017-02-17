'use strict';

var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var IonicConfig = IonicAppLib.config;
var Serve = IonicAppLib.serve;

var settings =  {
  title: 'address',
  name: 'address',
  isProjectTask: true
};

function run(ionic, argv) { // eslint-disable-line no-unused-vars

  // reset any address configs
  var ionConfig = IonicConfig.load();
  ionConfig.set('ionicServeAddress', null);
  ionConfig.set('platformServeAddress', null);
  return Serve.getAddress({ isAddressCmd: true });
}

module.exports = extend(settings, {
  run: run
});
