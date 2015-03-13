var colors = require('colors'),
    path = require('path'),
    semver = require('semver'),
    shelljs = require('shelljs'),
    args = require('optimist').argv,
    fs = require('fs'),
    jsonPath = path.join(__dirname, '../', '../', 'package.json'),
    packageJson = require(jsonPath),
    bumpLevel = args.level || 'patch',
    version = args.version ? args.version : semver.inc(packageJson.version, bumpLevel),
    bumpVersionMessage = ['Bumping from ', packageJson.version, ' by ', bumpLevel, ' resulting in ', version].join('');

if(args.npmInstall) {
  shelljs.rm('-rf', 'node_modules');
  shelljs.exec('npm install');
}

console.log(bumpVersionMessage.green)

packageJson.version = version;

shelljs.rm('npm-shrinkwrap.json');

fs.writeFileSync(jsonPath, JSON.stringify(packageJson, null, 2));

shelljs.exec('npm shrinkwrap')

if(args.git) {
  console.log('git commands')
  // shelljs.exec('git add npm-srhinkwrap.json');
  // shelljs.exec(['git commit -m "', bumpVersionMessage, '"'].join(''));
  // shelljs.exec(['git tag ', version].join(''));
  // shelljs.exec(['git push origin ', version].join(''))
}

if(args.npmPublish) {
  console.log('npm publish commands')
  // shelljs.exec('npm publish');
}
