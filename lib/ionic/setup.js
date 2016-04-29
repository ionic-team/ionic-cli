'use strict';

var _ = require('underscore');

var settings =  {
  title: 'setup',
  name: 'setup',
  summary: 'Configure the project with a build tool ' + '(beta)'.yellow,
  args: {
    '[sass]': 'Setup the project to use Sass CSS precompiling'
  }
};

function run() {

  // TODO link to gulp hook docs
  console.log('The setup task has been deprecated.\n');
}

module.exports = _.extend(settings, {
  run: run
});
