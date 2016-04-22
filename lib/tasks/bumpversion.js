require('colors');
var path = require('path');
var semver = require('semver');
var shelljs = require('shelljs');
var args = require('optimist').argv;
var fs = require('fs');
var jsonPath = path.join(__dirname, '../', '../', 'package.json');
var packageJson = require(jsonPath);
var version = null;
var bumpLevel = null;

// version = args.version ? args.version : semver.inc(packageJson.version, bumpLevel),

if (args.level && args.level === 'pre') {
  var id = args.identifier || 'beta';
  bumpLevel = [args.level, id].join('');
  version = semver.inc(packageJson.version, args.level, id);
} else {
  bumpLevel = args.level || 'patch';
  version = args.version ? args.version : semver.inc(packageJson.version, bumpLevel);
}

var bumpVersionMessage = ['Bumping from ', packageJson.version, ' by ', bumpLevel, ' resulting in ', version].join('');

console.log(bumpVersionMessage.green);

packageJson.version = version;

if (args.npmInstall) {
  shelljs.rm('-rf', 'node_modules');
  shelljs.exec('npm install');
}

shelljs.rm('npm-shrinkwrap.json');

fs.writeFileSync(jsonPath, JSON.stringify(packageJson, null, 2));

shelljs.exec('npm shrinkwrap');

if (args.git) {
  console.log('git commands');

  // shelljs.exec('git add npm-shrinkwrap.json');
  // shelljs.exec(['git commit -m "', bumpVersionMessage, '"'].join(''));
  // shelljs.exec(['git tag ', version].join(''));
  // shelljs.exec(['git push origin ', version].join(''))
}

if (args.npmPublishTag) {
  console.log('npm publish commands');
  var publishTagCmd = ['npm publish --tag ', version].join('');
  console.log(publishTagCmd);

  // shelljs.exec('npm publish');
} else if (args.npmPublish) {
  console.log('npm publish');
}
