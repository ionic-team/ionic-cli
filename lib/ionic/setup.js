'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle

var settings =  {
  title: 'setup',
  name: 'setup',
  summary: 'Configure the project with a build tool ' + '(beta)'.yellow,
  args: {
    '[sass]': 'Setup the project to use Sass CSS precompiling'
  },
  isProjectTask: true
};

function run() {

  // TODO link to gulp hook docs
  console.log('The setup task has been deprecated.\n');
}

module.exports = extend(settings, {
  run: run
});
