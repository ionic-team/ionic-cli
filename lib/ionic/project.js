var fs = require('fs'),
    path = require('path'),
    ionic = require('../ionic');

module.exports = {
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
  load: function() {
    this.file = this.PROJECT_FILE;
    if(fs.existsSync(this.file)) {      
      this.data = JSON.parse(fs.readFileSync(this.file))
    } else {
      console.error('Could not find ' + this.file + '!'+
        ' Please run this command in your root ionic project directory with that file.');
    }
    return this;
  },
  create: function(name) {
    this.file = this.PROJECT_FILE;
    this.data = this.PROJECT_DEFAULT;
    return this;
  },
  save: function(targetPath) {
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
      this.data = PROJECT_DEFAULT;
    }
    this.data[k] = v;
  },
  remove: function(k) {
    if(!this.data) {
      this.data = PROJECT_DEFAULT;
    }
    this.data[k] = '';
  }
};
