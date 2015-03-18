var fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    argv = require('optimist').argv,
    connect = require('connect'),
    finalhandler = require('finalhandler'),
    http = require('http'),
    serveStatic = require('serve-static'),
    tinylr = require('tiny-lr-fork'),
    lr = require('connect-livereload'),
    vfs = require('vinyl-fs'),
    request = require('request'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    proxyMiddleware = require('proxy-middleware'),
    url = require('url'),
    xml2js = require('xml2js'),
    IonicStats = require('./stats').IonicStats,
    shelljs = require('shelljs'),
    ports = require('./ports');

var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;
var IONIC_LAB_URL = '/ionic-lab';

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;
  this.port = argv._[1];
  this.liveReloadPort = argv._[2];

  this.loadSettings();

  this.getAddress()
  .then(function() {
    return self.checkPorts(true, self.port, self.address);
  })
  .then(function() {
    if(self.runLivereload) {
      return self.checkPorts(false, self.liveReloadPort, self.address);
    }
  })
  .then(function() {
    if(self.isAddressCmd) {
      console.log( self.address );
      process.exit();
    }

    self.start(ionic)

    // self.printCommandTips();
    // console.log('listenForServerCommands')
    // self.listenForServerCommands();

    if(ionic.hasFailed) return;

    ionic.latestVersion.promise.then(function(){
      ionic.printVersionWarning();
    });
  })
  .catch(function(error) {

  })

};

IonicTask.prototype.listenForServerCommands = function listenForServerCommands() {
  var self = this;
  var readline = require('readline');

  process.on("SIGINT", function(){
    process.exit();
  });

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  if(process.platform === "win32") {
    rl.on("SIGINT", function (){
      process.emit("SIGINT");
    });
  }

  rl.setPrompt('ionic $ ');
  rl.prompt();
  rl.on('line', function(entry) {

    if(entry === null) return;
    // console.log('entry', entry)
    var input = (entry + '').trim();

    if (input === 'quit' || input === 'q') rl.close();

    if (input === null) return;
    input = (input + '').trim();

    // console.log('input received:', input)

    if(input == 'restart' || input == 'r') {
      self._goToUrl('/?restart=' + Math.floor((Math.random() * 899999) + 100000));

    } else if(input.indexOf('goto ') === 0 || input.indexOf('g ') === 0) {
      var url = input.replace('goto ', '').replace('g ', '');
      self._goToUrl(url);

    } else if(input == 'consolelogs' || input == 'c') {
      self.printConsoleLogs = !self.printConsoleLogs;
      console.log('Console log output: '.green + (self.printConsoleLogs ? 'enabled' : 'disabled'));
      self._goToUrl('/?restart=' + Math.floor((Math.random() * 899999) + 100000));

    } else if(input == 'serverlogs' || input == 's') {
      self.printServerLogs = !self.printServerLogs;
      console.log('Server log output: '.green + (self.printServerLogs ? 'enabled' : 'disabled'));

    } else if(input.match(/^go\([+\-]?[0-9]{1,9}\)$/)) {
      self._goToHistory(input);

    } else if(input == 'help' || input == 'h') {
      self.printCommandTips();

    } else if(input == 'quit' || input == 'q') {
      if(self.childProcess) {
        self.childProcess.kill('SIGTERM');
      }
      process.exit();

    } else if(input == 'clear' || input == 'clr') {
      process.stdout.write("\u001b[2J\u001b[0;0H");

    } else {
      console.log('\nInvalid ionic server command'.error.bold);
      self.printCommandTips();
    }

    // console.log('input: ', input);
    rl.prompt();
  }).on('close', function() {
    process.exit(0);
  });

}

//isIonicServer = true when serving www directory, false when live reload
IonicTask.prototype.checkPorts = function(isIonicServer, testPort, testHost) {
  var q = Q.defer();

  var self = this,
      message = [];

  if(isIonicServer) {
    testHost = this.address == 'localhost' ? null : this.address;
  } else {
    testHost = null;
  }

  ports.getPort({port: testPort, host: testHost},
    function(err, port) {
    if(port != testPort) {
      message = ['The port ', testPort, ' was taken on the host ', self.address, ' - using port ', port, ' instead'].join('');
      console.log(message.yellow.bold);
      if(isIonicServer) {
        self.port = port;
      } else {
        self.liveReloadPort = port;
      }
    }
    q.resolve();
  });

  return q.promise;
}


IonicTask.prototype.loadSettings = function(cb) {
  var project = null;

  try {
    project = IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return
  }
  var self = this;

  this.port = this.port || argv.port || argv.p || DEFAULT_HTTP_PORT;
  this.liveReloadPort = this.liveReloadPort || argv.livereloadport || argv.r || argv['livereload-port'] || argv.i || DEFAULT_LIVE_RELOAD_PORT;
  this.launchBrowser = !argv.nobrowser && !argv.b;
  this.launchLab = this.launchBrowser && (argv.lab || argv.l);
  this.runLivereload = !(argv.nolivereload || argv.d);
  this.useProxy = !argv.noproxy && !argv.x;
  this.proxies = project.get('proxies') || [];
  this.watchSass = project.get('sass') === true && !argv.nosass && !argv.n;
  this.gulpStartupTasks = project.get('gulpStartupTasks');
  
  this.browser = argv.browser || argv.w || '';
  this.browserOption = argv.browserOption || argv.o || '';

  this.watchPatterns = project.get('watchPatterns') || ['www/**/*', '!www/lib/**/*'];
  this.printConsoleLogs = argv.consolelogs || argv['console-logs'] || argv.c;
  this.printServerLogs = argv.serverlogs || argv['server-logs'] || argv.s;
  this.isAddressCmd = argv._[0].toLowerCase() == 'address';
  this.documentRoot = project.get('documentRoot') || 'www';
  this.createDocumentRoot = project.get('createDocumentRoot') || null;
  this.contentSrc = path.join(this.documentRoot, this.ionic.getContentSrc());

};


IonicTask.prototype.printCommandTips = function(ionic) {
  console.log('Ionic server commands, enter:'.green.bold);
  console.log('  restart' + ' or '.green + 'r' + ' to restart the client app from the root'.green);
  console.log('  goto' + ' or '.green + 'g' + ' and a url to have the app navigate to the given url'.green);
  console.log('  consolelogs' + ' or '.green + 'c' + ' to enable/disable console log output'.green);
  console.log('  serverlogs' + ' or '.green + 's' + ' to enable/disable server log output'.green);
  console.log('  quit' + ' or '.green + 'q' + ' to shutdown the server and exit'.green);
  console.log('');
};

IonicTask.prototype.gulpInstalledGlobally = function gulpInstalledGlobally() {
  var result = shelljs.exec('gulp -v', { silent: true });

  if(result.code != 0) {
    return false;
  }
  return true;
}

IonicTask.prototype.showFinishedServeMessage = function() {
  if(this.launchLab || this.launchBrowser) {
    var open = require('open');
    var openUrl = this.launchLab ? [this.host(this.port), IONIC_LAB_URL] : [this.host(this.port)];
    if(this.browserOption) {
      openUrl.push(this.browserOption)
    }

    try {
      open(openUrl.join(''), this.browser);
    } catch (ex) {
      console.log('Error opening the browser - ', ex)
    }
  }

  this.printCommandTips();
  this.listenForServerCommands();

}

IonicTask.prototype.start = function(ionic) {
  try {
    var self = this;
    var app = connect();
    var childProcess = null;

    if (!fs.existsSync( path.resolve(this.documentRoot) )) {
      if (this.createDocumentRoot) {
        fs.mkdirSync(this.documentRoot);
      } else {
        return ionic.fail('"' + this.documentRoot + '" directory cannot be found. Please make sure the working directory is an Ionic project.');
      }
    }

    // gulpStartupTasks should be an array of tasks set in the project config
    // watchSass is for backwards compatible sass: true project config
    if((this.gulpStartupTasks && this.gulpStartupTasks.length) || this.watchSass) {
      var tasks = this.gulpStartupTasks || ['sass','watch'];

      if(!self.gulpInstalledGlobally()) {
        var message = ['You have specified Gulp start up tasks in your ionic.project file.'.red, '\n', 'However, you do not have Gulp installed globally. Please run '.red, '`npm install -g gulp`'.green].join('');
        return ionic.fail(message)
      }

      console.log('Gulp startup tasks:'.green.bold, tasks);
      self.childProcess = require('cross-spawn').spawn('gulp', tasks, { stdio: 'inherit' });
    }

    if(this.runLivereload) {

      vfs.watch(self.watchPatterns, {},function(f) {
        self._changed(f.path);
      });

      self.liveReloadServer = self.host(self.liveReloadPort);

      var lrServer = tinylr();
      try {
        lrServer.listen(self.liveReloadPort, function(err) {
          if(err) {
            return ionic.fail('Unable to start live reload server:', err);
          } else {
            console.log('Running live reload server:'.green.bold, self.liveReloadServer );
            console.log('Watching :'.green.bold, self.watchPatterns);
            self.showFinishedServeMessage();
          }
        });
      } catch(ex) {
        self.ionic.fail('Live Reload failed to start, error: ', ex.message)
      }

      app.use(require('connect-livereload')({
        port: this.liveReloadPort
      }));
    }

    if(this.useProxy) {

      for(var x=0; x<this.proxies.length; x++) {
        var proxy = this.proxies[x];

        var opts = url.parse(proxy.proxyUrl);
        if(proxy.proxyNoAgent)
            opts.agent = false;

        app.use(proxy.path, proxyMiddleware(opts));
        console.log('Proxy added:'.green.bold, proxy.path + " => " + url.format(proxy.proxyUrl));
      }
    }

    this.devServer = this.host(this.port);

    // Serve up the www folder by default
    var serve = serveStatic(this.documentRoot);

    // Create static server
    var server = http.createServer(function(req, res){
      var done = finalhandler(req, res);

      var urlParsed = url.parse(req.url, true);
      var platformOverride = urlParsed.query && urlParsed.query.ionicplatform;

      var platformUrl = getPlatformUrl(req);
      if(platformUrl) {
        var platformWWW = getPlatformWWW(req);

        if(self.isPlatformServe) {
          fs.readFile( path.resolve(path.join(platformWWW, platformUrl)), function (err, buf) {
            res.setHeader('Content-Type', 'application/javascript');
            if (err) {
              res.end('// mocked cordova.js response to prevent 404 errors during development');
              if(req.url == '/cordova.js') {
                self.serverLog(req, '(mocked)');
              } else {
                self.serverLog(req, '(Error ' + platformWWW + ')');
              }
            } else {
              self.serverLog(req, '(' + platformWWW + ')');
              res.end(buf);
            }
          });
        } else {
          self.serverLog(req, '(mocked)');
          res.setHeader('Content-Type', 'application/javascript');
          res.end('// mocked cordova.js response to prevent 404 errors during development');
        }
        return;
      }

      if(self.printConsoleLogs && req.url === '/__ionic-cli/console') {
        self.consoleLog(req);
        res.end('');
        return;
      }

      if(req.url === IONIC_LAB_URL) {
        // Serve the lab page with the given object with template data
        var labServeFn = function(context) {
          fs.readFile(path.resolve(path.join(__dirname, 'assets/preview.html')), function(err, buf) {
            var html;
            if(err) {
              res.end('404');
            } else {
              html = buf.toString('utf8');
              html = html.replace('//INSERT_JSON_HERE', 'var BOOTSTRAP = ' + JSON.stringify(context || {}));
            }
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
          });
        };

        // If the config.xml file exists, let's parse it for some nice features like
        // showing the name of the app in the title
        if(fs.existsSync('config.xml')) {
          fs.readFile(path.resolve('config.xml'), function(err, buf) {
            var xml = buf.toString('utf8');
            xml2js.parseString(xml, function (err, result) {
              labServeFn({
                appName: result.widget.name[0]
              });
            });
          });
        } else {
          labServeFn();
        }

        return;
      }

      if(req.url.split('?')[0] === '/') {
        fs.readFile( path.resolve(self.contentSrc), 'utf8', function (err, buf) {
          res.setHeader('Content-Type', 'text/html');
          if (err) {
            self.serverLog(req, 'ERROR!');
            res.end(err.toString());
          } else {
            self.serverLog(req, '(' + self.contentSrc + ')');

            var html = injectGoToScript( buf.toString('utf8') );

            if(self.printConsoleLogs) {
              html = injectConsoleLogScript(html);
            }

            if(platformOverride) {
              html = injectPlatformScript( html, platformOverride );
            }

            res.end(html);
          }
        });
        return;
      }

      // root www directory file
      self.serverLog(req);
      serve(req, res, done);
    });

    // Listen
    app.use(server);
    try {
      app.listen(this.port, this.address);
    }catch(ex) {
      self.ionic.fail('Failed to start the Ionic server: ', ex.message)
    }

    console.log('Running dev server:'.green.bold, this.devServer);

    if(!self.runLivereload) {
      self.showFinishedServeMessage();
    }


  } catch(e) {
    var msg;
    if(e && (e + '').indexOf('EMFILE') > -1) {
      msg = (e + '\n').error.bold +
            'The watch process has exceed the default number of files to keep open.\n'.error.bold +
            'You can change the default with the following command:\n\n'.error.bold +
            '  ulimit -n 1000\n\n' +
            'In the command above, it\'s setting the default to watch a max of 1000 files.\n\n'.error.bold;

    } else {
      msg = ('server start error: ' + e.stack).error.bold;
    }
    console.log(msg);
    process.exit(1);
  }
};


IonicTask.prototype.serverLog = function(req, msg) {
  if(this.printServerLogs) {
    var log = 'serve  '.yellow;

    log += (req.url.length > 60 ? req.url.substr(0, 57) + '...' : req.url).yellow;

    if(msg) {
      log += '  ' + msg.yellow;
    }

    var ua = (req.headers && req.headers['user-agent'] || '');
    if(ua.indexOf('Android') > 0) {
      log += '  Android'.small;
    } else if(ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1 || ua.indexOf('iPod') > -1) {
      log += '  iOS'.small;
    } else if(ua.indexOf('Windows Phone') > -1) {
      log += '  Windows Phone'.small;
    }

    console.log(log);
  }
};


IonicTask.prototype.consoleLog = function(req) {
  var body = '';

  req.on('data', function (data) {
    if(data) body += data;
  });

  req.on('end', function () {
    if(!body) return;

    try {
      var log = JSON.parse(body);

      var msg = log.index + '  ';
      while(msg.length < 5) {
        msg += ' ';
      }

      msg += ' ' + (log.ts + '').substr(7) + '   ';

      msg += log.method;
      while(msg.length < 24) {
        msg += ' ';
      }

      var msgIndent = '';
      while(msgIndent.length < msg.length) {
        msgIndent += ' ';
      }

      if(log.method == 'dir' || log.method == 'table') {
        var isFirstLine = true;

        log.args.forEach(function(argObj){

          for(objKey in argObj) {
            if(isFirstLine) {
              isFirstLine = false;
            } else {
              msg += '\n' + msgIndent;
            }
            msg += objKey + ': ';
            try {
              msg += ( JSON.stringify(argObj[objKey], null, 1) ).replace(/\n/g, '');
            } catch(e) {
              msg += argObj[objKey];
            }
          }

        });

      } else if(log.args.length) {
        if(log.args.length === 2 && log.args[0] === '%o' && log.args[1] == '[object Object]') return;
        msg += log.args.join(', ');
      }

      if(log.method == 'error' || log.method == 'exception') msg = msg.red;
      else if(log.method == 'warn') msg = msg.yellow;
      else if(log.method == 'info') msg = msg.green;
      else if(log.method == 'debug') msg = msg.blue;

      console.log(msg);
    }catch(e){}
  });
};


function getPlatformUrl(req) {
  if(req.url == '/cordova.js' || req.url == '/cordova_plugins.js' || req.url.indexOf('/plugins/') === 0) {
    return req.url;
  }
}


function getPlatformWWW(req) {
  var platformPath = 'www';

  if(req && req.headers && req.headers['user-agent']) {
    var ua = req.headers['user-agent'].toLowerCase();
    if(ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1) {
      platformPath = path.join('platforms', 'ios', 'www');

    } else if(ua.indexOf('android') > -1) {
      platformPath = path.join('platforms', 'android', 'assets', 'www');
    }
  }

  return platformPath;
}


function injectConsoleLogScript(html) {
  try{
    var findTags = html.match(/<html(?=[\s>])(.*?)>|<head>|<meta charset(.*?)>/gi);
    var insertAfter = findTags[ findTags.length - 1 ];

    return html.replace(insertAfter, insertAfter + '\n\
    <script>\n\
      // Injected Ionic CLI Console Logger\n\
      (function() {\n\
        var methods = "assert clear count debug dir dirxml error exception group groupCollapsed groupEnd info log markTimeline profile profileEnd table time timeEnd timeStamp trace warn".split(" ");\n\
        var console = (window.console=window.console || {});\n\
        var logCount = 0;\n\
        window.onerror = function(msg, url, line) {\n\
          if(msg && url) console.error(msg, url, (line ? "Line: " + line : ""));\n\
        };\n\
        function sendConsoleLog(method, args) {\n\
          try {\n\
            var xhr = new XMLHttpRequest();\n\
            xhr.open("POST", "/__ionic-cli/console", true);\n\
            xhr.send(JSON.stringify({ index: logCount, method: method, ts: Date.now(), args: args }));\n\
            logCount++;\n\
          } catch(e){}\n\
        }\n\
        for(var x=0; x<methods.length; x++) {\n\
          (function(m){\n\
            var orgConsole = console[m];\n\
            console[m] = function() {\n\
              try {\n\
                sendConsoleLog(m, Array.prototype.slice.call(arguments));\n\
                if(orgConsole) orgConsole.apply(console, arguments);\n\
              } catch(e){}\n\
            };\n\
          })(methods[x]);\n\
        }\n\
      }());\n\
    </script>');
  }catch(e){}

  return html;
}


function injectGoToScript(html) {
  try{
    var findTags = html.match(/<html(?=[\s>])(.*?)>|<head>|<meta charset(.*?)>/gi);
    var insertAfter = findTags[ findTags.length - 1 ];

    return html.replace(insertAfter, insertAfter + '\n\
    <script>\n\
      // Injected Ionic Go To URL Live Reload Plugin\n\
      window.LiveReloadPlugin_IonicGoToUrl = (function() {\n\
        var GOTO_KEY = "__ionic_goto_url__";\n\
        var HISTORY_GO_KEY = "__ionic_history_go__";\n\
        var GoToUrlPlugin = function(window, host) {\n\
          this.window = window;\n\
          this.host = host;\n\
        }\n\
        GoToUrlPlugin.identifier = "__ionic_goto_url__";\n\
        GoToUrlPlugin.version = "1.0";\n\
        GoToUrlPlugin.prototype.reload = function(path) {\n\
          try {\n\
            if(path) {\n\
              if(path.indexOf(GOTO_KEY) === 0) {\n\
                this.window.document.location = path.replace(GOTO_KEY, "");\n\
                return true;\n\
              }\n\
              if(path.indexOf(HISTORY_GO_KEY) === 0) {\n\
                this.window.document.history.go( parseInt(path.replace(HISTORY_GO_KEY, ""), 10));\n\
                return true;\n\
              }\n\
            }\n\
          } catch(e) {\n\
            console.log(e);\n\
          }\n\
          return false;\n\
        };\n\
        return GoToUrlPlugin;\n\
      })();\n\
    </script>');
  }catch(e){}

  return html;
}

/**
 * Inject the platform override for choosing Android or iOS during
 * development.
 */
function injectPlatformScript(html, platformOverride) {
  try {
    var findTags = html.toLowerCase().indexOf('</body>');
    if(findTags < 0) { return html; }

    return html.slice(0, findTags) + '\n' +
    '<script>\n' +
      'ionic && ionic.Platform && ionic.Platform.setPlatform("' + platformOverride + '");\n' +
    '</script>\n' +
    html.slice(findTags);
  } catch(e) {}

  return html;
}

IonicTask.prototype._changed = function(filePath) {
  // Cleanup the path a bit
  var pwd = process.cwd();
  filePath = filePath.replace(pwd + '/', '');

  if( filePath.indexOf('.css') > 0 ) {
    console.log( ('CSS changed:  ' + filePath).green );
  } else if( filePath.indexOf('.js') > 0 ) {
    console.log( ('JS changed:   ' + filePath).green );
  } else if( filePath.indexOf('.html') > 0 ) {
    console.log( ('HTML changed: ' + filePath).green );
  } else {
    console.log( ('File changed: ' + filePath).green );
  }

  this._postToLiveReload( [filePath] );
};


IonicTask.prototype._goToUrl = function(url) {
  console.log( ('Loading: ' + url).green );
  this._postToLiveReload( ['__ionic_goto_url__' + url] );
};


IonicTask.prototype._goToHistory = function(goHistory) {
  goHistory = goHistory.replace('go(', '').replace(')', '');
  console.log( ('History Go: ' + goHistory).green );
  this._postToLiveReload( ['__ionic_history_go__' + goHistory] );
};


IonicTask.prototype._postToLiveReload = function(files) {
  var postUrl = [this.liveReloadServer, '/changed'].join('')
  request.post(postUrl, {
    path: '/changed',
    method: 'POST',
    body: JSON.stringify({
      files: files
    })
  }, function(err, res, body) {
    if(err) {
      console.log('Unable to update live reload:', err);
    }
  });

}


IonicTask.prototype.getAddress = function(cb) {
  var q = Q.defer();
  try {
    var self = this;
    var addresses = [];
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ionicConfig = require('./config').load();

    var addressConfigKey = (self.isPlatformServe ? 'platformServeAddress' : 'ionicServeAddress');
    var tryAddress;

    if(self.isAddressCmd) {
      // reset any address configs
      ionicConfig.set('ionicServeAddress', null);
      ionicConfig.set('platformServeAddress', null);
    } else {
      if(!argv.address)
        tryAddress = ionicConfig.get(addressConfigKey);
      else
        tryAddress = argv.address;
    }

    if(ifaces){
      for (var dev in ifaces) {
        if(!dev) continue;
        ifaces[dev].forEach(function(details){
          if (details && details.family == 'IPv4' && !details.internal && details.address) {
            addresses.push({
              address: details.address,
              dev: dev
            });
          }
        });
      }
    }

    if(tryAddress) {
      if(tryAddress == 'localhost') {
        self.address = tryAddress;
        // cb();
        q.resolve();
        return q.promise;
      }
      for(var x=0; x<addresses.length; x++) {
        // double check if this address is still available
        if(addresses[x].address == tryAddress)
        {
          self.address = addresses[x].address;
          // cb();
          q.resolve();
          return q.promise;
        }
      }
      if (argv.address) {
        self.ionic.fail('Address ' + argv.address + ' not available.');
        return q.promise;
      }
    }

    if(addresses.length > 0) {
      
      if(!self.isPlatformServe) {
        addresses.push({
          address: 'localhost'
        });
      }

      if(addresses.length === 1) {
        self.address = addresses[0].address;
        // cb();
        q.resolve();
        return q.promise;
      } 

      console.log('\nMultiple addresses available.'.error.bold);
      console.log('Please select which address to use by entering its number from the list below:'.error.bold);
      if(self.isPlatformServe) {
        console.log('Note that the emulator/device must be able to access the given IP address'.small);
      }

      for(var x=0; x<addresses.length; x++) {
        console.log( (' ' + (x+1) + ') ' + addresses[x].address + ( addresses[x].dev ? ' (' + addresses[x].dev + ')' : '' )).yellow );
      }

      console.log('Std in before prompt')
      // console.log(process.stdin)

      var prompt = require('prompt');
      var promptProperties = {
        selection: {
          name: 'selection',
          description: 'Address Selection: '.yellow.bold,
          required: true
        }
      };

      prompt.override = argv;
      prompt.message = '';
      prompt.delimiter = '';
      prompt.start();

      prompt.get({properties: promptProperties}, function (err, promptResult) {
        if(err) {
          return console.log(err);
        }

        var selection = promptResult.selection;
        for(var x=0; x<addresses.length; x++) {
          if(selection == (x + 1) || selection == addresses[x].address || selection == addresses[x].dev) {
            self.address = addresses[x].address;
            if(!self.isAddressCmd) {
              console.log('Selected address: '.green.bold + self.address);
            }
            ionicConfig.set(addressConfigKey, self.address);
            // cb();
            prompt.resume();
            q.resolve();
            return q.promise;
          }
        }

        self.ionic.fail('Invalid address selection');
      });

    } else if(self.isPlatformServe) {
      // no addresses found
      self.ionic.fail('Unable to find an IPv4 address for run/emulate live reload.\nIs WiFi disabled or LAN disconnected?');

    } else {
      // no address found, but doesn't matter if it doesn't need an ip address and localhost will do
      self.address = 'localhost';
      // cb();
      q.resolve();
    }

  } catch(e) {
    self.ionic.fail('Error getting IPv4 address: ' + e);
  }

  return q.promise;
};

IonicTask.prototype.host = function(port) {
  return 'http://' + this.address + ':' + port;
};

exports.IonicTask = IonicTask;
