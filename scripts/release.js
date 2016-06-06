/*
 * This script will create a new github release using the verion
 * specified from within the package.json file. The output from
 * the changelog command will be the body of the tag. The name
 * is the package.JSON.version
 */
var changelog = require('conventional-changelog');
var GithubApi = require('github');
var packageJSON = require('../package.json');
var through = require('through2');

var github = new GithubApi({
  version: '3.0.0'
});

github.authenticate({
  type: 'oauth',
  token: process.env.GH_TOKEN
});

return changelog({
  preset: 'angular'
})
.pipe(through.obj(function(file) {
  github.releases.createRelease({
    owner: 'driftyco',
    repo: 'ionic-cli',
    target_commitish: 'v2', // eslint-disable-line camelcase
    tag_name: 'v' + packageJSON.version, // eslint-disable-line camelcase
    name: packageJSON.version,
    body: file.toString(),
    prerelease: true
  }, function(err, data) {
    if (err) console.log('error: ' + err);
    console.log(data);
  });
}));
