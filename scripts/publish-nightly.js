const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const tempPackageJsonPath = path.join(__dirname, '..', 'package-orig.json');
const originalPackageJson = require(packageJsonPath);

/*
 * This script assumes the `build` step was run prior to it
 */

function backupOriginalPackageJson() {
  const originalContent = JSON.stringify(originalPackageJson, null, 2);
  fs.writeFileSync(tempPackageJsonPath, originalContent);
}

function createNightlyVersionInPackageJson() {
  const originalVersion = originalPackageJson.version;
  originalPackageJson.version = `${originalVersion}-${createTimestamp()}`;
  fs.writeFileSync(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));
}

function revertPackageJson() {
  let fileContent = fs.readFileSync(tempPackageJsonPath);
  fileContent = `${fileContent}\n`;
  fs.writeFileSync(packageJsonPath, fileContent);
  fs.unlinkSync(tempPackageJsonPath);
}

function createTimestamp() {
  // YYYYMMDDHHMM
  const d = new Date();
  return d.getUTCFullYear() + // YYYY
          ('0' + (d.getUTCMonth() + 1)).slice(-2) + // MM
          ('0' + (d.getUTCDate())).slice(-2) + // DD
          ('0' + (d.getUTCHours())).slice(-2) + // HH
          ('0' + (d.getUTCMinutes())).slice(-2); // MM
}

function publishToNpm() {
  const command = `npm publish --tag=nightly ${process.cwd()}`;
  execSync(command);
}


function mainFunction() {
  try {
    console.log('Building Nightly ... BEGIN');
    console.log('Backing up the original package.json');
    backupOriginalPackageJson();
    console.log('Creating the nightly version of package.json');
    createNightlyVersionInPackageJson();
    console.log('Publishing to npm');
    publishToNpm();
    console.log('Restoring original package.json');
    revertPackageJson();
    console.log('Building Nightly ... DONE');
  }
  catch (ex) {
    console.log(`Something went wrong with publishing the nightly. This process modifies the package.json, so restore it before committing code! - ${ex.message}`);
    process.exit(1);
  }
}

mainFunction();
