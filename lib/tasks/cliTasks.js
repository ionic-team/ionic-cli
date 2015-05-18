var resourcesSummary = [
  'Automatically create icon and splash screen resources' + ' (beta)'.yellow, 
  'Put your images in the ./resources directory, named splash or icon.',
  'Accepted file types are .png, .ai, and .psd.',
  'Icons should be 192x192 px without rounded corners.',
  'Splashscreens should be 2208x2208 px, with the image centered in the middle.\n'
].join('\n\t\t      ');

var TASKS = [
  {
    title: 'start',
    name: 'start',
    summary: 'Starts a new Ionic project in the specified PATH',
    args: {
      '[options]': 'any flags for the command',
      '<PATH>': 'directory for the new project',
      '[template]': 'Template name, ex: tabs, sidemenu, blank\n' +
                    'Codepen url, ex: http://codepen.io/ionic/pen/odqCz\n' +
                    'Defaults to Ionic "tabs" starter template'
    },
    options: {
      '--appname|-a': 'Human readable name for the app (Use quotes around the name)',
      '--id|-i': 'Package name for <widget id> config, ex: com.mycompany.myapp',
      '--no-cordova|-w': 'Create a basic structure without Cordova requirements',
      '--sass|-s': 'Setup the project to use Sass CSS precompiling',
      '--list|-l': 'List starter templates available',
      '--io-app-id': 'The Ionic.io app ID to use'
    },
    module: './ionic/start'
  },
  {
    title: 'serve',
    name: 'serve',
    summary: 'Start a local development server for app dev/testing',
    args: {
      '[options]': ''
    },
    options: {
      '--consolelogs|-c': 'Print app console logs to Ionic CLI',
      '--serverlogs|-s': 'Print dev server logs to Ionic CLI',
      '--port|-p': 'Dev server HTTP port (8100 default)',
      '--livereload-port|-r': 'Live Reload port (35729 default)',
      '--nobrowser|-b': 'Disable launching a browser',
      '--nolivereload|-d': 'Do not start live reload',
      '--noproxy|-x': 'Do not add proxies',
      '--address': 'Use specific address or return with failure',
      '--all|-a': 'Have the server listen on all addresses (0.0.0.0)',
      '--browser|-w': 'Specifies the browser to use (safari, firefox, chrome)',
      '--browseroption|-o': 'Specifies a path to open to (/#/tab/dash)',
      '--lab|-l': 'Test your apps on multiple screen sizes and platform types',
      '--nogulp': 'Disable running gulp during serve',
      '--platform|-t': 'Start serve with a specific platform (ios/android)'
    },
    module: './ionic/serve'
  },
  {
    title: 'platform',
    name: 'platform',
    summary: 'Add platform target for building an Ionic app',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--noresources|-r': 'Do not add default Ionic icons and splash screen resources',
      '--nosave|-e': 'Do not save the platform to the package.json file'
    },
    module: './ionic/cordova'
  },
  {
    title: 'run',
    name: 'run',
    summary: 'Run an Ionic project on a connected device',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--livereload|-l': 'Live reload app dev files from the device' + ' (beta)'.yellow,
      '--port|-p': 'Dev server HTTP port (8100 default, livereload req.)',
      '--livereload-port|-r': 'Live Reload port (35729 default, livereload req.)',
      '--consolelogs|-c': 'Print app console logs to Ionic CLI (livereload req.)',
      '--serverlogs|-s': 'Print dev server logs to Ionic CLI (livereload req.)',
      '--debug|--release': '',
      '--device|--emulator|--target=FOO': ''
    },
    module: './ionic/cordova'
  },
  {
    title: 'emulate',
    name: 'emulate',
    summary: 'Emulate an Ionic project on a simulator or emulator',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--livereload|-l': 'Live reload app dev files from the device' + ' (beta)'.yellow,
      '--port|-p': 'Dev server HTTP port (8100 default, livereload req.)',
      '--livereload-port|-r': 'Live Reload port (35729 default, livereload req.)',
      '--consolelogs|-c': 'Print app console logs to Ionic CLI (livereload req.)',
      '--serverlogs|-s': 'Print dev server logs to Ionic CLI (livereload req.)',
      '--nohooks|-n': 'Do not add default Ionic hooks for Cordova',
      '--debug|--release': '',
      '--device|--emulator|--target=FOO': ''
    },
    module: './ionic/cordova'
  },
  {
    title: 'build',
    name: 'build',
    summary: 'Locally build an Ionic project for a given platform',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--nohooks|-n': 'Do not add default Ionic hooks for Cordova',
    },
    module: './ionic/cordova'
  },
  {
    title: 'plugin add',
    name: 'plugin',
    summary: 'Add a Cordova plugin',
    args: {
      '[options]': '',
      '<SPEC>': 'Can be a plugin ID, a local path, or a git URL.'
    },
    options: {
      '--searchpath <directory>': 'When looking up plugins by ID, look in this directory\n' +
                                  'and subdirectories first for the plugin before\n' +
                                  'looking it up in the registry.',
      '--nosave|-e': 'Do not save the plugin to the package.json file'
    },
    module: './ionic/cordova'
  },
  {
    title: 'prepare',
    name: 'prepare',
    module: './ionic/cordova'
  },
  {
    title: 'compile',
    name: 'compile',
    module: './ionic/cordova'
  },
  {
    title: 'resources',
    name: 'resources',
    summary: resourcesSummary,
    options: {
      '--icon|-i': 'Generate icon resources',
      '--splash|-s': 'Generate splash screen resources'
    },
    module: './ionic/resources/generate'
  },
  {
    title: 'package',
    name: 'package',
    alt: ['pack'],
    summary: 'Package an app using the Ionic Build service' + ' (beta)'.yellow,
    args: {
      '[options]': '',
      '<MODE>': '"debug" or "release"',
      '<PLATFORM>': '"ios" or "android"'
    },
    options: {
      '--android-keystore-file|-k': 'Android keystore file',
      '--android-keystore-alias|-a': 'Android keystore alias',
      '--android-keystore-password|-w': 'Android keystore password',
      '--android-key-password|-r': 'Android key password',
      '--ios-certificate-file|-c': 'iOS certificate file',
      '--ios-certificate-password|-d': 'iOS certificate password',
      '--ios-profile-file|-f': 'iOS profile file',
      '--output|-o': 'Path to save the packaged app',
      '--no-email|-n': 'Do not send a build package email',
      '--clear-signing|-l': 'Clear out all signing data from Ionic server',
      '--email|-e': 'Ionic account email',
      '--password|-p': 'Ionic account password'
    },
    module: './ionic/package'
  },
  {
    title: 'upload',
    name: 'upload',
    summary: 'Upload an app to your Ionic account',
    options: {
      '--email|-e': 'Ionic account email',
      '--password|-p': 'Ionic account password'
    },
    alt: ['up'],
    module: './ionic/upload'
  },
  {
    title: 'share',
    name: 'share',
    summary: 'Share an app with a client, co-worker, friend, or customer',
    args: {
      '<EMAIL>': 'The email to share the app with',
    },
    module: './ionic/share'
  },
  {
    title: 'lib',
    name: 'lib',
    summary: 'Gets Ionic library version or updates the Ionic library',
    args: {
      '[options]': '',
      '[update]': 'Updates the Ionic Framework in www/lib/ionic'
    },
    options: {
      '--version|-v': 'Specific Ionic version\nOtherwise it defaults to the latest version'
    },
    module: './ionic/lib'
  },
  {
    title: 'setup',
    name: 'setup',
    summary: 'Configure the project with a build tool ' + '(beta)'.yellow,
    args: {
      '[sass]': 'Setup the project to use Sass CSS precompiling'
    },
    module: './ionic/setup'
  },
  {
    title: 'login',
    name: 'login',
    module: './ionic/login'
  },
  {
    title: 'address',
    name: 'address',
    module: './ionic/serve'
  },
  {
    title: 'app',
    name: 'app',
    // summary: 'Deploy a new Ionic app version or list versions',
    // options: {
    //   '--versions|-v': 'List recently uploaded versions of this app',
    //   '--deploy|-d': 'Upload the current working copy and mark it as deployed',
    //   '--note|-n': 'Add a note to a deploy',
    //   '--uuid|-u': 'Mark an already uploaded version as deployed'
    // },
    module: './ionic/app'
   },
   {
    title: 'push',
    name: 'push',
    module: './ionic/push'
   },
   {
    title: 'browser',
    name: 'browser',
    summary: 'Add another browser for a platform ' + '(beta)'.yellow,
    args: {
      '<command>': '"add remove rm info versions upgrade list ls revert"',
      '[browser]': 'The browser you wish to add or remove (Crosswalk)'
    },
    options: {
      '--nosave|-n': 'Do not save the platforms and plugins to the package.json file'
    },
    module: './ionic/browser'
  },
  {
    title: 'service add',
    name: 'service',
    summary: 'Add an Ionic service package and install any required plugins',
    args: {
      '[options]': '',
      '<SPEC>': 'Can be a service name or a git url'
    },
    module: './ionic/service'
   },
   {
    title: 'add',
    name: 'add',
    summary: 'Add an Ion, bower component, or addon to the project',
    args: {
      '[name]': 'The name of the ion, bower component, or addon you wish to install'
    },
    module: './ionic/add'
   },
   {
    title: 'remove',
    name: 'remove',
    summary: 'Remove an Ion, bower component, or addon from the project',
    args: {
      '[name]': 'The name of the Ion, bower component, or addon you wish to remove'
    },
    module: './ionic/add',
    alt: ['rm']
   },
   {
    title: 'list',
    name: 'list',
    summary: 'List Ions, bower components, or addons in the project',
    module: './ionic/add',
    alt: ['ls']
   },
   {
    title: 'ions',
    name: 'ions',
    summary: 'List available ions to add to your project',
    module: './ionic/ions'
   },
   {
    title: 'templates',
    name: 'templates',
    summary: 'List available Ionic starter templates',
    module: './ionic/templates'
   },
   {
     title: 'info',
     name: 'info',
     summary: 'List information about the users runtime environment',
     module: './ionic/info'
   },
   {
     title: 'help',
     name: 'help',
     summary: 'Provides help for a certain command',
     args: {
       '[command]': 'The command you desire help with'
     },
     module: './ionic/help'
   },
   {
    title: 'link',
    name: 'link',
    summary: 'Sets your Ionic App ID for your project',
    args: {
      '[appId]': 'The app ID you wish to set for this project'
    },
    options: {
      '--reset|-r': 'This will reset the Ionic App ID'
    },
    module: './ionic/link'
   },
   {

    title: 'hooks',
    name: 'hooks',
    summary: 'Manage your Ionic Cordova hooks',
    args: {
      '[add|remove|permissions|perm]': 'Add, remove, or modify permissions on the default Ionic Cordova hooks'
    },
    module: './ionic/hooks'
  },
  {
    title: 'state',
    name: 'state',
    summary: 'Saves or restores state of your Ionic Application using the package.json file',
    args: {
      '<COMMAND>': '[ save | restore | clear | reset ]'
    },
    options: {
      'save': 'Save the platforms and plugins into package.json',
      'restore': 'Restore the platforms and plugins from package.json',
      'clear': 'Clear the package.json of cordovaPlugins and cordovaPlatforms, as well as clear out the platforms and plugins folders',
      'reset': 'Clear out the platforms and plugins directories, and reinstall plugins and platforms',
      '--plugins': 'Only do operations with plugins',
      '--platforms': 'Only do operations with platforms'
    },
    module: './ionic/state'
   },
   {
    title: 'docs',
    name: 'docs',
    summary: 'Opens up the documentation for Ionic',
    args: {
      '<TOPIC>': 'the topic to view help documentation for. Use "ls" to view all topics'
    },
    module: './ionic/docs'
   }
];


module.exports = TASKS;
