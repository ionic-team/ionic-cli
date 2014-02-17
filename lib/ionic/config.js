var fs = require('fs'),
    path = require('path'),
    ionic = require('../ionic');

var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

module.exports = {
  CONFIG_FILE: '.ionic/ionic.config',
  PROJECT_FILE: 'ionic.project',
  PROJECT_DEFAULT: {
    name: '',
    email: '',
    app_id: '',
    package_name: '',    
    ios_certificate: '',
    ios_certificate_password: '',
    ios_profile: '',
    android_keystore: '',
    android_keystore_alias: '',
    android_keystore_password: '',
    android_key_password: ''
  },
  loadConfig: function() {
    this.file = this.CONFIG_FILE;
    if(fs.existsSync(path.join(home,this.file))) {      
      this.data = JSON.parse(fs.readFileSync(path.join(home, this.file)));
    } else {
      this.data = {};
    }
    return this;
  },
  loadProject: function() {
    this.file = this.PROJECT_FILE;
    if(fs.existsSync(this.file)) {      
      this.data = JSON.parse(fs.readFileSync(this.file))
    } else {
      console.error('Could not find ' + this.file + '!'+
        ' Please run this command in your root ionic project directory with that file.');
    }
    return this;
  },
  createProject: function(name) {
    this.file = this.PROJECT_FILE;
    this.data = this.PROJECT_DEFAULT;
    this.data.name = name;
    return this;
  },
  saveConfig: function() {
    if(!this.data) { 
      return;
    }
    try {
      var dirPath = path.join(home, path.dirname(this.CONFIG_FILE));
      var p = path.join(home, this.CONFIG_FILE);

      if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
      fs.writeFileSync(p, JSON.stringify(this.data, null, 2));
    } catch(e) {
      console.error('Unable to save settings file:', e);
    }
  },
  saveProject: function(targetPath) {
    if(!this.data) { 
      console.trace();
      console.error('This should never happen!'); 
    }
    try {
      fs.writeFileSync((targetPath?targetPath+'/':'')+this.PROJECT_FILE, JSON.stringify(this.data, null, 2));
    } catch(e) {
      console.error('Unable to save settings file:', e);
    }
  },
  get: function(k) {
    return this.data[k];
  },
  set: function(k, v) {
    if(!this.data) {
      this.data = {};
    }
    this.data[k] = v;
    
    if(this.file == this.PROJECT_FILE) {
      this.saveProject();
    } else {
      this.saveConfig();
    }
  }  
};
