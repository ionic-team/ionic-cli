const extend = require('../utils/extend');
const path = require('path');

const COMMAND_DIRECTORY = 'ionic';

/**
 * List of shorthands that are available for each command
 */
const shorthands = {
  g: 'generate',
  ls: 'list',
  rm: 'remove',
  up: 'upload'
};

/**
 * List of affordances that are available for each command
 * Sometimes we will add misspellings here or if we change a command name
 */
const affordances = {
  platforms: 'platform',
  plugins: 'plugin',
  address: 'serve',
  lab: 'serve'
};

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
const orderedListOfCommands = [
  'start',
  'serve',
  'setup',
  'generate',
  'platform',
  'prepare',
  'run',
  'emulate',
  'build',
  'plugin',
  'resources',
  'upload',
  'share',
  'lib',
  'login',
  'io',
  'security',
  'push',
  'package',
  'config',
  'service',
  'add',
  'remove',
  'list',
  'info',
  'help',
  'link',
  'hooks',
  'state',
  'address',
  'compile',
  'docs'
];

const cmdMap = orderedListOfCommands.reduce((completeObj, commandName) => {
  completeObj[commandName] = commandName;
  return completeObj;
}, {});

let allCommands = extend(extend(extend({}, shorthands), affordances), cmdMap);
allCommands = Object.keys(allCommands).reduce((allCmds, commandName) => {
  allCmds[commandName] = `./${path.join(COMMAND_DIRECTORY, allCommands[commandName])}`;
  return allCmds;
}, {});


export default {
  orderedListOfCommands,
  allCommands
};
