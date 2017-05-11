#!/usr/bin/env node

const path = require('path');
const replace = require('replace');

const pluginName = process.argv[2];
const pluginPath = path.join(__dirname, `../packages/${pluginName}`);
const plugin = require(pluginPath);
const pkg = require(path.join(pluginPath, 'package.json'));
const nameMatchStr = '__NAME__';
const versionMatchStr = '__VERSION__';

if (!plugin.name) {
  throw new Error(`Plugin ${pluginName} MUST define and export a 'name' attribute`);
}

if (!plugin.version) {
  throw new Error(`Plugin ${pluginName} MUST define and export a 'version' attribute`);
}

const replacePath = path.join(pluginPath, pkg.main);

const pluginVersion = process.env['IONIC_PREPUBLISH_PLUGIN_VERSION'] || pkg.version;

replace({
  regex: nameMatchStr,
  replacement: pkg.name,
  paths: [replacePath],
  recursive: false
});
replace({
  regex: versionMatchStr,
  replacement: pluginVersion,
  paths: [replacePath],
  recursive: false
});
