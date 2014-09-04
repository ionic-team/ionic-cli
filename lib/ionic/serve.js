var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    connect = require('connect'),
    finalhandler = require('finalhandler'),
    http = require('http'),
    serveStatic = require('serve-static'),
    open = require('open'),
    tinylr = require('tiny-lr-fork'),
    lr = require('connect-livereload'),
    vfs = require('vinyl-fs'),
    request = require('request'),
    Q = require('q'),
    spawn = require('child_process').spawn,
    IonicProject = require('./project'),
    Task = require('./task').Task;
    IonicStats = require('./stats').IonicStats;

var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  this.port = argv._[1];
  this.liveReloadPort = argv._[2];

  this.loadSettings();
  this.start(ionic);

  if(ionic.hasFailed) return;

  ionic.latestVersion.promise.then(function(){
    ionic.printVersionWarning();
  });
};


IonicTask.prototype.loadSettings = function() {
  var project = IonicProject.load();

  this.port = this.port || argv.port || argv.p || DEFAULT_HTTP_PORT;
  this.liveReloadPort = this.liveReloadPort || argv.livereloadport || argv['livereload-port'] || argv.i || DEFAULT_LIVE_RELOAD_PORT;

  this.launchBrowser = !argv.nobrowser && !argv.b;
  this.runLivereload = !argv.nolivereload && !argv.r;
  this.watchSass = project.get('sass') === true && !argv.nosass && !argv.n;
  this.printServerLogs = argv.serverlogs || argv['server-logs'] || argv.s;
  this.printConsoleLogs = argv.consolelogs || argv['console-logs'] || argv.c;
};

IonicTask.prototype.start = function(ionic) {
  var self = this;
  var app = connect();

  if (!fs.existsSync( path.resolve('www') )) {
    return ionic.fail('"www" directory cannot be found. Make sure the working directory is an Ionic project.');
  }

  if(this.watchSass) {
    var childProcess = spawn('gulp', ['sass','watch']);

    childProcess.stdout.on('data', function (data) {
      process.stdout.write(data);
    });

    childProcess.stderr.on('data', function (data) {
      if(data) {
        process.stderr.write(data.toString().yellow);
      }
    });
  }

  if(this.runLivereload) {
    vfs.watch('www/**/*', {
    }, function(f) {
      self._changed(f.path);
    });

    self.liveReloadServer = self.host(self.liveReloadPort);

    var lrServer = tinylr();
    lrServer.listen(this.liveReloadPort, function(err) {
      if(err) {
        return ionic.fail('Unable to start live reload server:', err);
      } else {
        console.log('Running live reload server:'.green.bold, self.liveReloadServer.bold );
        if(self.launchBrowser) {
          open( self.host(self.port) );
        }
      }
    });

    app.use(require('connect-livereload')({
      port: this.liveReloadPort
    }));
  }

  if(this.printConsoleLogs) {
    self.consoleServer = self.host(self.consoleLogPort);

  }

  this.devServer = this.host(this.port);

  // Serve up the www folder by default
  var serve = serveStatic('www');

  // Create static server
  var server = http.createServer(function(req, res){
    var done = finalhandler(req, res);

    var platformUrl = getPlatformUrl(req);
    if(platformUrl) {
      var platformWWW = getPlatformWWW(req);

      if(self.isPlatformServe) {
        fs.readFile( path.resolve(path.join(platformWWW, platformUrl)), function (err, buf) {
          res.setHeader('Content-Type', 'application/javascript');
          if (err) {
            self.serverLog(req.url + '  (Error ' + platformWWW + ')');
            res.statusCode = 404;
            res.end('// 404');
          } else {
            self.serverLog(req.url + '  (' + platformWWW + ')');
            res.end(buf);
          }
        });
      } else {
        self.serverLog(req.url + '  (mocked)');
        res.setHeader('Content-Type', 'application/javascript');
        res.end('// mocked cordova.js response to prevent 404 errors during development');
      }
      return;
    }

    if(self.printConsoleLogs) {

      if(req.url === '/__ionic-cli/console') {
        self.consoleLog(req);
        res.end('');
        return;
      }

      if(req.url === '/') {
        fs.readFile( path.resolve('www/index.html'), 'utf8', function (err, buf) {
          res.setHeader('Content-Type', 'text/html');
          if (err) {
            self.serverLog(req.url + ' : ERROR!');
            res.end(err.toString());
          } else {
            self.serverLog(req.url);
            res.end( insertConsoleLogScript(buf.toString('utf8')) );
          }
        });
        return;
      }

    }

    // root www directory file
    self.serverLog(req.url);
    serve(req, res, done);
  });

  // Listen
  app.use(server);
  app.listen(this.port);

  console.log('Running dev server:'.green.bold, this.devServer.bold);

  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null && /exit|quit|close|stop/gi.test(chunk)) {
      process.exit();
    }
  });
};


IonicTask.prototype.serverLog = function(msg) {
  if(this.printServerLogs) {
    console.log( ('serve: ' + msg).yellow );
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
      while(msg.length < 4) {
        msg += ' ';
      }

      msg += log.method;
      while(msg.length < 14) {
        msg += ' ';
      }

      var msgIndent = '';
      while(msgIndent.length < msg.length) {
        msgIndent += ' ';
      }

      if(log.method == 'dir') {
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

      } else {
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


function insertConsoleLogScript(html) {
  try{
    var headTag = html.match(/<head>/gi)[0];

    return html.replace(headTag, headTag + '\n\
    <script>\n\
      // Injected Ionic CLI Console Logger\n\
      (function() {\n\
        var methods = "assert clear count debug dir dirxml error exception group groupCollapsed groupEnd info log markTimeline profile profileEnd table time timeEnd timeStamp trace warn".split(" ");\n\
        var console = (window.console=window.console || {});\n\
        var logCount = 0;\n\
        function sendConsoleLog(method, args) {\n\
          try {\n\
            var xhr = new XMLHttpRequest();\n\
            xhr.open("POST", "/__ionic-cli/console", true);\n\
            xhr.send(JSON.stringify({ index: logCount, method: method, args: args }));\n\
            logCount++;\n\
          } catch(e){}\n\
        }\n\
        window.onerror = function(msg, url, line) {\n\
          if(msg && url) console.error(msg, url, (line ? "Line: " + line : ""));\n\
        };\n\
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

IonicTask.prototype._changed = function(filePath) {
  // Cleanup the path a bit
  var pwd = process.cwd();
  filePath = filePath.replace(pwd + '/', '');

  if( filePath.indexOf('.css') > 0 ) {
    console.log( (' CSS changed: ' + filePath).green );
  } else if( filePath.indexOf('.js') > 0 ) {
    console.log( ('  JS changed: ' + filePath).green );
  } else if( filePath.indexOf('.html') > 0 ) {
    console.log( ('HTML changed: ' + filePath).green );
  } else {
    console.log( ('File changed: ' + filePath).green );
  }

  var req = request.post('http://localhost:' + this.liveReloadPort + '/changed', {
    path: '/changed',
    method: 'POST',
    body: JSON.stringify({
      files: [filePath]
    })
  }, function(err, res, body) {
    if(err) {
      console.error('Unable to update live reload:', err);
    }
  });
};


IonicTask.prototype.host = function(port) {
  var addresses = [];

  try {
    var os = require('os');
    var ifaces = os.networkInterfaces();

    for (var dev in ifaces) {
      if(!dev || dev.indexOf('box') > -1) continue;
      ifaces[dev].forEach(function(details){
        if (details.family == 'IPv4' && !details.internal) {
          addresses.push(details.address);
        }
      });
    }
  } catch(e) {}

  return 'http://' + (addresses.length === 1 ? addresses[0] : 'localhost') + ':' + port;
};

exports.IonicTask = IonicTask;
