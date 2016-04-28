var fs = require('fs');
var path = require('path');

function IonicStore(fileName) {
  this.data = {};

  if (!fileName) return this;

  this.fileName = fileName;
  if (fileName.indexOf('.') < 0) {
    this.fileName += '.data';
  }

  this.homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

  this.privateDir = path.join(this.homeDir, '.ionic');

  if (!fs.existsSync(this.privateDir)) {
    fs.mkdirSync(this.privateDir);
  }

  this.filePath = path.join(this.privateDir, this.fileName);

  try {
    this.data = JSON.parse(fs.readFileSync(this.filePath));
  } catch (e) {} // eslint-disable-line no-empty

  return this;
}

IonicStore.prototype.get = function(k) {
  if (k) {
    return this.data[k];
  }
  return this.data;
};

IonicStore.prototype.set = function(k, v) {
  this.data[k] = v;
};

IonicStore.prototype.remove = function(k) {
  delete this.data[k];
};

IonicStore.prototype.save = function() {
  try {
    var dataStoredAsString = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(this.filePath, dataStoredAsString);
    this.data = JSON.parse(dataStoredAsString);
  } catch (e) {
    console.error('Unable to save ionic data:', this.filePath, e);
  }
};

exports.IonicStore = IonicStore;
