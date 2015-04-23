var fs = require('fs'),
    path = require('path');
    // ionic = require('../ionic');

var home = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

module.exports = {
  CONFIG_FILE: '.ionic/ionic.config',
  load: function() {
    this.file = this.CONFIG_FILE;
    if (fs.existsSync(path.join(home,this.file))) {
      this.data = JSON.parse(fs.readFileSync(path.join(home, this.file)));
    } else {
      this.data = {};
    }
    return this;
  },
  save: function() {
    if (!this.data) {
      return;
    }
    try {
      var dirPath = path.join(home, path.dirname(this.CONFIG_FILE));
      var p = path.join(home, this.CONFIG_FILE);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
      fs.writeFileSync(p, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Unable to save settings file: ' + e);
    }
  },
  get: function(k) {
    return this.data[k];
  },
  set: function(k, v) {
    if (!this.data) {
      this.data = {};
    }
    this.data[k] = v;

    this.save();
  }
};
