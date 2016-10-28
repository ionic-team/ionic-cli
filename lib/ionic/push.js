'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var fs = require('fs');
var path = require('path');
var parseUrl = require('url').parse;
var request = require('request');
var argv = require('optimist').argv;
var prompt = require('prompt');
var FormData = require('form-data');
var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var Login = IonicAppLib.login;
var log = IonicAppLib.logging.logger;
var fail = IonicAppLib.utils.fail;
var LoginTask = require('./login');

var settings =  {
  title: 'push',
  name: 'push',
  summary: 'Upload APNS and GCM credentials to Ionic Push',
  options: {
    '--ios-dev-cert': 'Upload your development .p12 file to Ionic Push',
    '--ios-prod-cert': 'Upload your production .p12 file to Ionic Push',
    '--production-mode=y,n': 'Tell Ionic Push to use production (y) or sandbox (n) APNS servers',
    '--google-api-key <your-gcm-api-key>': "Set your app's GCM API key on Ionic Push"
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var task = {
    ionic: ionic,
    inputValues: {},
    inputFiles: {},
    useCmdArgs: false
  };

  getCmdLineOptions();

  Login.retrieveLogin()
  .then(function(jar) {
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    task.jar = jar;

    if (argv._[1] && argv._[1].trim() === 'webhook_url') {
      if (argv._[2]) {
        set_webhook_url(task, argv._[2].trim());
      } else {
        log.error(chalk.bold.red('You need to specify a webhook url!'));
      }
    } else if (argv['google-api-key']) {
      set_google_api_key(task, argv['google-api-key'].trim());
    } else if (argv['send'] || argv.s) {

      // Dev wants to send a push notification
      send_push(task);
    } else if (argv['ios-dev-cert'] || argv['ios-prod-cert'] || argv.d || argv.p) {

      // Dev wants to upload an ios push cert
      upload_cert(task);
    } else if (argv['production-mode'] || argv.l) {

      // Dev wants to switch between test/live mode
      // this will look like --live-mode=[y/n]
      // where y will put into live and n will put into dev
      set_production_mode(task);
    }
  })
  .catch(function(ex) {
    log.error('An error occurred', ex);
  });
}

function set_webhook_url(task, webhook_url) { // eslint-disable-line camelcase
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    log.error(chalk.bold.red('You need to upload your app first!'));
    return false;
  }

  var url = task.ionic.IONIC_DASH + task.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/webhook-url';
  var params = parseUrl(url);

  var form = new FormData();
  form.append('csrfmiddlewaretoken', getCsrfToken(task.jar));
  form.append('webhook_url', webhook_url);

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: task.jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    })
  },
  function(err, response) {
    response.on('data', function() {
      if (err) {
        return fail('Error setting Webhook URL: ' + err);
      }

      if (parseInt(response.statusCode, 10) === '200') {
        log.info('Webhook URL set to', webhook_url);
      } else {
        return fail('App not found');
      }
    });
  });

  return true;
}


function set_google_api_key(task, google_api_key) { // eslint-disable-line camelcase
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    log.error(chalk.bold.red('You need to upload your app first!'));
    return false;
  }

  var url = task.ionic.IONIC_DASH + task.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/google-api-key';
  var params = parseUrl(url);

  var form = new FormData();
  form.append('csrfmiddlewaretoken', getCsrfToken(task.jar));
  form.append('android_api_key', google_api_key);

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: task.jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    })
  },
  function(err, response) {
    response.on('data', function() {
      if (err) {
        return fail('Error setting Google API Key: ' + err);
      }

      if (parseInt(response.statusCode, 10) === '200') {
        log.info(chalk.green('Google API Key Saved'));
      } else {
        return fail('App not found');
      }
    });
  });

  return true;
}


function send_push() { // eslint-disable-line camelcase
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    log.error(chalk.bold.red('You need to upload your app first!'));
    return false;
  }

  // So, we need the push API key to send notifications.
  var promptProperties = {};

  promptProperties['push-api-key'] = {
    name: 'push-api-key',
    description: chalk.yellow.bold('Your private API key'),
    required: true,
    isFile: false
  };

  promptProperties['device-token'] = {
    name: 'device-token',
    description: chalk.yellow.bold('Device token'),
    required: true,
    isFile: false
  };

  promptProperties['alert'] = {
    name: 'alert',
    description: chalk.yellow.bold('Notification alert message'),
    required: false,
    isFile: false
  };

  promptProperties['badge'] = {
    name: 'badge',
    description: chalk.yellow.bold('Badge count'),
    required: false,
    isFile: false
  };

  promptProperties['sound'] = {
    name: 'sound',
    description: chalk.yellow.bold('Sound file name'),
    required: false,
    isFile: false
  };

  prompt.start();

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err) {
      return fail('Error: ' + err);
    }

    var apiKey = promptResult['push-api-key'];

    var notification = {
      platform: 'ios',
      tokens: [promptResult['device-token']],
      notification: {
        alert: promptResult['alert'],
        ios: {
          badge: promptResult['badge'],
          sound: promptResult['sound']
        }
      }
    };

    var options = {
      url: 'https://push.ionic.io/api/v1/push',
      method: 'POST',
      json: true,
      headers: {
        'X-Ionic-Application-Id': project.get('app_id'),
        authorization: 'Basic ' + new Buffer(apiKey + ':').toString('base64')
      },
      body: notification
    };

    request(options, function(err, response) {
      if (!err && parseInt(response.statusCode, 10) === 202) {
        log.info('Successfully queued push notification');
      } else {
        log.error('Error queueing push notification', err);
      }
    });
  });
}

function set_production_mode(task) { // eslint-disable-line camelcase
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    log.error(chalk.bold.red('You need to upload your app first!'));
    return false;
  }

  if (task.inputValues['production-mode'] === true) {
    log.error(chalk.bold.red('You need to specify a value [y/n] to set the production mode!'));
    return false;
  }

  task.inputValues['production-mode'] = task.inputValues['production-mode'].toLowerCase();

  if (task.inputValues['production-mode'] !== 'y' && task.inputValues['production-mode'] !== 'n') {
    log.error(chalk.bold.red('You need to specify a value [y/n] to set the production mode!'));
    return false;
  }

  var url = task.ionic.IONIC_DASH + task.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/set-production-mode';
  var params = parseUrl(url);

  var form = new FormData();
  form.append('csrfmiddlewaretoken', getCsrfToken(task.jar));
  form.append('production_mode', task.inputValues['production-mode']);

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: task.jar.map(function(c) {
        return c.key + '=' + encodeURIComponent(c.value);
      }).join('; ')
    })
  },
  function(err, response) {
    if (err) {
      return fail('Error uploading certificate: ' + err);
    }

    response.setEncoding('utf8');
    response.on('data', function(data) {
      if (err) {
        return fail('Error setting mode: ' + err);
      }

      try {
        var d = JSON.parse(data);
        if (d.errors && d.errors.length) {
          for (var j = 0; j < d.errors.length; j += 1) {
            log.error(chalk.bold.red(d.errors[j]));
          }
          return fail('Unable to set mode');
        }

        if (task.inputValues['production-mode'] === 'y') {
          log.info('Successfully set production mode');
        } else {
          log.info('Successfully set development mode');
        }

      } catch (parseEx) {
        return fail('Error response: ' + parseEx);
      }
    });
  });
}

function upload_cert(task) { // eslint-disable-line camelcase
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    log.error(chalk.bold.red('You need to upload your app first!'));
    return false;
  }


  var promptProperties = {};
  var prodCert = '0';

  if (argv['ios-dev-cert']) {
    promptProperties['ios-push-cert'] = {
      name: 'ios-push-cert',
      description: chalk.yellow.bold('iOS Dev Push Certificate File (.p12)'),
      required: true,
      conform: fileExists,
      isFile: true
    };
  } else if (argv['ios-prod-cert']) {
    promptProperties['ios-push-cert'] = {
      name: 'ios-push-cert',
      description: chalk.yellow.bold('iOS Prod Push Certificate File (.p12)'),
      required: true,
      conform: fileExists,
      isFile: true
    };

    prodCert = '1';
  }

  prompt.start();

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err) {
      return fail('Error: ' + err);
    }

    var url = task.ionic.IONIC_DASH + task.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/upload-push-cert';
    var params = parseUrl(url);

    var form = new FormData();
    form.append('csrfmiddlewaretoken', getCsrfToken(task.jar));

    var inputFile;

    try {
      inputFile = promptResult['ios-push-cert'].replace(/\\ /g, ' ').trim();
      form.append('ios_push_cert', fs.createReadStream(resolvePath(inputFile)));
    } catch (e) {
      return fail('Error loading ' + resolvePath(inputFile));
    }

    // Set the flag for if this is a production or dev cert
    form.append('prod_cert', prodCert);

    form.submit({
      protocol: params.protocol,
      hostname: params.hostname,
      port: params.port,
      path: params.path,
      headers: form.getHeaders({
        cookie: task.jar.map(function(c) {
          return c.key + '=' + encodeURIComponent(c.value);
        }).join('; ')
      })
    },
    function(err, response) {
      if (err) {
        return fail('Error uploading certificate: ' + err);
      }

      response.setEncoding('utf8');
      response.on('data', function(data) {
        if (err) {
          return fail('Error uploading certificate: ' + err);
        }

        try {
          var d = JSON.parse(data);
          if (d.errors && d.errors.length) {
            for (var j = 0; j < d.errors.length; j += 1) {
              log.error(chalk.bold.red(d.errors[j]));
            }
            return fail('Unable to upload certificate');
          }

          log.info('Successfully uploaded certificate');

        } catch (parseEx) {
          return fail('Error response: ' + parseEx);
        }
      });
    });
  });
}

function getCmdLineOptions(task) {

  function getCmdArgValue(propertyName, shortName) {
    var value = argv[propertyName] || argv[shortName];
    if (value) {
      task.inputValues[propertyName] = value;
      task.useCmdArgs = true;
    }
  }

  function getCmdArgFile(propertyName, shortName) {
    var value = argv[propertyName] || argv[shortName];
    if (value) {
      if (!fileExists(value)) {
        return fail('Unable to find file: ' + argv[propertyName]);
      }
      task.inputFiles[propertyName] = value;
      task.useCmdArgs = true;
    }
  }

  getCmdArgValue('production-mode', 'l');

  getCmdArgFile('ios-push-dev-cert', 'd');
  getCmdArgFile('ios-push-prod-cert', 'p');
}

function getCsrfToken(jar) {
  for (var i = 0; i < jar.length; i += 1) {
    if (jar[i].key === 'csrftoken') {
      return jar[i].value;
    }
  }
  return '';
}

function fileExists(filePath) {

  // check if a file exists with a relative path or absolute path
  filePath = filePath.replace(/\\ /g, ' ').trim();
  return fs.existsSync(resolvePath(filePath));
}

function resolvePath(p) {
  if (p.substr(0, 1) === '~') {
    p = process.env.HOME + p.substr(1);
  }
  return path.resolve(p);
}

module.exports = extend(settings, {
  run: run,
  set_webhook_url: set_webhook_url, // eslint-disable-line camelcase
  set_google_api_key: set_google_api_key, // eslint-disable-line camelcase
  send_push: send_push, // eslint-disable-line camelcase
  set_production_mode: set_production_mode, // eslint-disable-line camelcase
  upload_cert: upload_cert, // eslint-disable-line camelcase
  getCmdLineOptions: getCmdLineOptions,
  getCsrfToken: getCsrfToken
});
