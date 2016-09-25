'use strict';

var extend = require('../utils/extend');
var path = require('path');
var ionicAppLib = require('ionic-app-lib');
var appGenerator = require('@ionic/app-generators');
var log = ionicAppLib.logging.logger;
var Project =  ionicAppLib.project;
var fail = ionicAppLib.utils.fail;

var settings = {
  title: 'generate',
  alt: ['g'],
  name: 'generate',
  summary: 'Generate pages and components',
  options: {
    '--list': {
      title: 'List available generators',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv) {
  try {
    if (!argv.list && argv._.length < 3) {

      // TODO should have a mechanism for printing usage on invalid tasks
      fail('Invalid arguments. Usage: ionic generate <generator> <name>');
    }

    if (!argv.v2) {
      return fail('Generators are only available for Ionic 2 projects');
    }

    var project;
    try {
      project = Project.load(process.cwd());
    } catch (err) {
      return fail(err);
    }

    var generator = argv._[1];
    var name = argv._[2]; // TODO support multiple names
    var isTS = project.get('typescript') || argv.ts;

    if (argv.list) {
      appGenerator.printAvailableGenerators();
      return;
    }

    var includeSpec = argv.includeSpec ? true : false;
    var includeSass = argv.skipScss ? false : true;

    var generatorOptions = {
      generatorType: generator,
      suppliedName: name,
      includeSpec: includeSpec,
      includeSass: includeSass
    };

    var componentsDir = path.join(process.cwd(), 'src', 'components');
    var directivesDir = path.join(process.cwd(), 'src', 'components');
    var pagesDir = path.join(process.cwd(), 'src', 'pages');
    var pipesDir = path.join(process.cwd(), 'src', 'pipes');
    var providersDir = path.join(process.cwd(), 'src', 'providers');
    var templateDir = path.join(process.cwd(), 'node_modules', 'ionic-angular', 'templates');

    if (argv.componentsDir && argv.componentsDir.length > 0) {
      componentsDir = path.resolve(argv.componentsDir);
    }

    if (argv.directivesDir && argv.directivesDir.length > 0) {
      directivesDir = path.resolve(argv.directivesDir);
    }

    if (argv.pagesDir && argv.pagesDir.length > 0) {
      pagesDir = path.resolve(argv.pagesDir);
    }

    if (argv.pipesDir && argv.pipesDir.length > 0) {
      pipesDir = path.resolve(argv.pipesDir);
    }

    if (argv.providersDir && argv.providersDir.length > 0) {
      providersDir = path.resolve(argv.providersDir);
    }

    if (argv.templateDir && argv.templateDir.length > 0) {
      templateDir = path.resolve(argv.templateDir);
    }


    var projectStructureOptions = {
      absoluteComponentDirPath: componentsDir,
      absoluteDirectiveDirPath: directivesDir,
      absolutePagesDirPath: pagesDir,
      absolutePipeDirPath: pipesDir,
      absoluteProviderDirPath: providersDir,
      absolutePathTemplateBaseDir: templateDir
    };

    return appGenerator.generate(generatorOptions, projectStructureOptions).catch(function(err) {
      if (err.message === 'Unknown Generator Type') {
        log.error(err.message);
        appGenerator.printAvailableGenerators();
        return;
      } else {
        return fail(err);
      }
    });


  } catch (err) {
    return fail('There was an error generating your item:', err);
  }
}

function loadToolingModule() {

  // First try node_modules/ionic-angular/tooling
  var toolingPath;
  var ionicModule;

  try {
    toolingPath = path.join(process.cwd(), 'node_modules', 'ionic-angular', 'tooling');
    ionicModule = require(toolingPath);
  } catch (err) {

    // if this isn't found, that's fine, check for ionic-framework
    if (err.code !== 'MODULE_NOT_FOUND') {
      fail('Error when requiring ' + toolingPath + ':\n  ' + err);
    }
  }

  // Then try node_modules/ionic-framework/tooling
  if (!ionicModule) {
    try {
      ionicModule = require(path.join(process.cwd(), 'node_modules', 'ionic-framework', 'tooling'));
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        fail('No ionic-angular package found, do you have Ionic installed?');
      }
    }
  }

  // Last, try node_modules/ionic-framework (beta.1 and below)
  if (!ionicModule) {
    try {
      ionicModule = require(path.join(process.cwd(), 'node_modules', 'ionic-framework'));
    } catch (err) {
      fail(err);
    }
  }
  return ionicModule;
}

module.exports = extend(settings, {
  run: run
});
