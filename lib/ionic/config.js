var fs = require('fs'),
    path = require('path'),
    ionic = require('../ionic');

var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

module.exports = {
  CONF_DIR: '.ionic',
  CONF_FILE: '.ionic/info.json',
  getConfig: function() {
    if(fs.existsSync(path.join(home, this.CONF_FILE))) {
      var data = JSON.parse(fs.readFileSync(path.join(home, this.CONF_FILE)));
      this.data = data;
    } else {
      this.create();
    }
    return this;
  },
  get: function(k) {
    return this.data[k];
  },
  set: function(k, v) {
    if(!this.data) {
      this.create();
    }
    this.data[k] = v;
    this.save();
  },
  save: function() {
    if(!this.data) { return; }

    var dirPath = path.join(home, this.CONF_DIR);
    var p = path.join(home, this.CONF_FILE);

    if(!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    if(!fs.exists(p)) {
      fs.writeFileSync(p, JSON.stringify(this.data));
    }
  },
  create: function() {
    this.data = {};
    this.save();
  }
};
