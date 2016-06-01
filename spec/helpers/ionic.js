'use strict';

var cli = require('../../lib/cli');

/*
 * args
 * [0] = node
 * [1] = ionic
 * [2] = command
 *
 */
module.exports = function ionic(ionicArgs) {
  var cliArgs = [
    'node',
    'bin/ionic'
  ];

  return cli.run(cliArgs.concat(ionicArgs));
};
