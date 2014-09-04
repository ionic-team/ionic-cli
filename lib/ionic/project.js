var fs = require('fs'),
    path = require('path');

module.exports = {
  PROJECT_FILE: 'ionic.project',
  PROJECT_DEFAULT: {
    name: '',
    app_id: ''
  },
  load: function() {
    this.file = this.PROJECT_FILE;

    if(fs.existsSync(this.file)) {
      this.data = JSON.parse(fs.readFileSync(this.file));

    } else {
      if(fs.existsSync('www')) {
        var parts = path.resolve('./').split(path.sep);
        var dirname = parts[parts.length-1];
        this.create(dirname);
        this.save('./');
      }
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
      this.data = this.PROJECT_DEFAULT;
    }
    this.data[k] = v;
  },
  remove: function(k) {
    if(!this.data) {
      this.data = this.PROJECT_DEFAULT;
    }
    this.data[k] = '';
  }
};
