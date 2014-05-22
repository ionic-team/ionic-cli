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
  },
  load: function() {
    this.file = this.PROJECT_FILE;    
    if(fs.existsSync(this.file)) {
      this.data = JSON.parse(fs.readFileSync(this.file))
    } else {
      if(fs.existsSync('www')) {
        var parts = path.resolve('./').split(path.sep);
        var dirname = parts[parts.length-1];
        console.log('We have a www folder in the', dirname, 'project');
        this.create(dirname);
        this.save('./');
      }
      /*
      Ionic.fail('Could not find your ' + this.file + ' file!'+
        ' Please run this command in the root of your ionic project.');
      */
    }
    return this;
  },
  create: function(name) {
    this.file = this.PROJECT_FILE;
    this.data = this.PROJECT_DEFAULT;
    if(name) {
      this.set('name', name);
    }
    return this;
  },
  save: function(targetPath) {
    if(!this.data) { 
      console.trace();
      console.error('This should never happen!'); 
    }
    try {
      fs.writeFileSync((targetPath?targetPath + '/':'') + this.PROJECT_FILE, JSON.stringify(this.data, null, 2));
    } catch(e) {
      console.error('Unable to save settings file:', e);
    }
  },
  get: function(k) {
    if(!this.data) {
      return null;
    }
    if(k) {
      return this.data[k];
    } else {
      return this.data;
    }
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
