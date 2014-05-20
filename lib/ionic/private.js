var fs = require('fs'),
    path = require('path'),
    ionic = require('../ionic');

var home = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;

module.exports = {
  PRIVATE_PATH: '.ionic/',
  PRIVATE_EXT: '.project',
  PRIVATE_DEFAULT: {
    ios_certificate: '',
    ios_certificate_password: '',
    ios_profile: '',
    android_keystore: '',
    android_keystore_alias: '',
    android_keystore_password: '',
    android_key_password: ''
  },
  load: function(app_id) {
    if(app_id) {
      this.file = this.PRIVATE_PATH+app_id+this.PRIVATE_EXT;    
      if(fs.existsSync(path.join(home,this.file))) {      
        this.data = JSON.parse(fs.readFileSync(path.join(home, this.file)));
      } else {
        this.data = this.PRIVATE_DEFAULT;
      }
    }
    return this;
  },
  create: function() {
    this.data = this.PRIVATE_DEFAULT;
    return this;
  },
  save: function(app_id) {
    if(!this.data) { 
      console.trace();
      console.error('This should never happen!'); 
    }
    if(app_id) {
      this.file = this.PRIVATE_PATH+app_id+this.PRIVATE_EXT;  
      try {
        fs.writeFileSync(path.join(home,this.file), JSON.stringify(this.data, null, 2));
      } catch(e) {
        console.error('Unable to save private settings file:', e);
      }
    }
  },
  get: function(k) {
    if(k) {
      return this.data[k];
    } else {
      return this.data;
    }
  },
  set: function(k, v) {
    if(!this.data) {
      this.data = PRIVATE_DEFAULT;
    }
    this.data[k] = v;
  },
  remove: function(k) {
    if(!this.data) {
      this.data = PRIVATE_DEFAULT;
    }
    this.data[k] = '';
  }
};
