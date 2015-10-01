var resourcesSummary = [
  'Crea iconos y Splashscreens automáticamente' + ' (beta)'.yellow,
  'Añade tus imágenes en el directorio ./resources, llamado splash o icon.',
  'Acepta archivos con extensión .png, .ai, and .psd.',
  'Los iconoces deberían ser de 192x192 px sin bordes redondeados.',
  'Splashscreens deberían ser de 2208x2208 px, con la imagen centrada en el medio.\n'
].join('\n\t\t      ');

var cordovaRunEmulateOptions = {
  '--livereload|-l': 'Live reload de los archivos del dispositivo' + ' (beta)'.yellow,
  '--port|-p': 'Puerto HTTP del servidor (por defecto 8100, livereload req.)',
  '--livereload-port|-r': 'Imprimir por consola los mensajes de la aplicación (livereload req.)',
  '--consolelogs|-c': {
    title: 'Imprimir por consola los mensaje del servidor (livereload req.)',
    boolean: true
  },
  '--serverlogs|-s': {
    title: 'Imprimir por consola los mensaje del servidor (livereload req.)',
    boolean: true
  },
  '--debug|--release': {
    title: '',
    boolean: true
  },
  '--device|--emulator|--target=FOO': ''
};

var TASKS = [
  {
    title: 'start',
    name: 'start',
    summary: 'Empieza un nuevo proyecto en la ruta especificada',
    args: {
      '[options]': 'Algunos parámetros para la consola',
      '<PATH>': 'Directorio para el nuevo proyecto',
      '[template]': 'Nombre de la plantilla, ejemplo: tabs, sidemenu, blank\n' +
                    'Url de Codepen, ejemplo: http://codepen.io/ionic/pen/odqCz\n' +
                    'Plantilla "tabs" por defecto para Ionic'
    },
    options: {
      '--appname|-a': 'Nombre descriptivo para la aplicación (usar commillas)',
      '--id|-i': 'Nombre del paquete, ejemplo: com.mycompany.myapp',
      '--no-cordova|-w': {
        title: 'Crear la estructura básica sin los requisitos de Cordova',
        boolean: true
      },
      '--sass|-s': {
        title: 'Configurar el proyecto para usar el preprocesador Sass',
        boolean: true
      },
      '--list|-l': {
        title: 'Listado de plantillas disponibles',
        boolean: true
      },
      '--io-app-id': 'Identificador para usar en Ionic.io',
      '--template|-t': 'Plantilla de inicio para el proyecto',
      '--zip-file|-z': 'URL para descargar la plantilla de inicio'
    },
    module: './ionic/start'
  },
  {
    title: 'serve',
    name: 'serve',
    summary: 'Iniciar un servidor local para desarrollo/testeo',
    args: {
      '[options]': ''
    },
    options: {
      '--consolelogs|-c': {
        title: 'Imprimir por consola los mensajes de la aplicación',
        boolean: true
      },
      '--serverlogs|-s': {
        title: 'Imprimir por consola los mensajes del servidor',
        boolean: true
      },
      '--port|-p': 'Puerto HTTP del servidor (por defecto el 8100)',
      '--livereload-port|-r': 'Puerto del live reload (35729 default)',
      '--nobrowser|-b': {
        title: 'Desactivar la ejecución del navegador',
        boolean: true
      },
      '--nolivereload|-d': {
        title: 'No iniciar live reload',
        boolean: true
      },
      '--noproxy|-x': {
        title: 'No añadir proxies',
        boolean: true
      },
      '--address': 'Usar una dirección específica o devolver un error',
      '--all|-a': {
        title: 'Tener el servidor escuchando en todas las direcciones (0.0.0.0)',
        boolean: true
      },
      '--browser|-w': 'Especificar el navegador por defecto (safari, firefox, chrome)',
      '--browseroption|-o': 'Especificar una ruta para abrir (/#/tab/dash)',
      '--lab|-l': {
        title: 'Testear la aplicacion en múltiples tamaños de pantalla y diferentes plataformas',
        boolean: true
      },
      '--nogulp': {
        title: 'Desactivar la ejecución de gulp durante "serve"',
        boolean: true
      },
      '--platform|-t': 'Empezar "serve" con una plataforma específica (ios/android)'
    },
    module: './ionic/serve'
  },
  {
    title: 'platform',
    name: 'platform',
    alt: ['platforms'],
    summary: 'Añadir una plataforma a la aplicación',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--noresources|-r': {
        title: 'No añadir iconos y splash screen por defecto de Ionic',
        boolean: true
      },
      '--nosave|-e': {
        title: 'No guardar la plataforma en el dichero package.json',
        boolean: true
      }
    },
    module: './ionic/cordova',
    alt: ['platforms']
  },
  {
    title: 'run',
    name: 'run',
    summary: 'Ejecutar un proyecto Ionic en un dispositivo conectado',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: cordovaRunEmulateOptions,
    module: './ionic/cordova'
  },
  {
    title: 'emulate',
    name: 'emulate',
    summary: 'Emular un proyecto Ionic en un emulador',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: cordovaRunEmulateOptions,
    module: './ionic/cordova'
  },
  {
    title: 'build',
    name: 'build',
    summary: 'Construir un proyecto local Ionic para una plataforma específica',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--nohooks|-n': {
        title: 'No añadir los hooks por defecto de Cordova',
        boolean: true
      }
    },
    module: './ionic/cordova'
  },
  {
    title: 'plugin add',
    name: 'plugin',
    summary: 'Añadir un plugin de Cordova',
    args: {
      '[options]': '',
      '<SPEC>': 'Puede ser un plugin usando su ID, una ruta local o una dirección git.'
    },
    options: {
      '--searchpath <directory>': 'Cuando busca por ID, lo hace primero en este directorio\n' +
                                  'y subdirectorios, antes de hacerlo en el registro',
      '--nosave|-e': {
        title: 'No guardar el plugin en el fichero package.json',
        boolean: true
      }
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
      '--icon|-i': {
        title: 'Generar iconos',
        boolean: true
      },
      '--splash|-s': {
        title: 'Generar Splashscreens',
        boolean: true
      }
    },
    module: './ionic/resources/generate'
  },
  // {
  //   title: 'package',
  //   name: 'package',
  //   alt: ['pack'],
  //   summary: 'Package an app using the Ionic Build service' + ' (beta)'.yellow,
  //   args: {
  //     '[options]': '',
  //     '<MODE>': '"debug" or "release"',
  //     '<PLATFORM>': '"ios" or "android"'
  //   },
  //   options: {
  //     '--android-keystore-file|-k': 'Android keystore file',
  //     '--android-keystore-alias|-a': 'Android keystore alias',
  //     '--android-keystore-password|-w': 'Android keystore password',
  //     '--android-key-password|-r': 'Android key password',
  //     '--ios-certificate-file|-c': 'iOS certificate file',
  //     '--ios-certificate-password|-d': 'iOS certificate password',
  //     '--ios-profile-file|-f': 'iOS profile file',
  //     '--output|-o': 'Path to save the packaged app',
  //     '--no-email|-n': {
  //       title: 'Do not send a build package email',
  //       boolean: true
  //     },
  //     '--clear-signing|-l': 'Clear out all signing data from Ionic server',
  //     '--email|-e': 'Ionic account email',
  //     '--password|-p': 'Ionic account password'
  //   },
  //   module: './ionic/package'
  // },
  {
    title: 'upload',
    name: 'upload',
    summary: 'Subir la aplicación a tu cuenta de Ionic',
    options: {
      '--email|-e': 'Cuenta de correo de Ionic',
      '--password|-p': 'clave de la cuenta de Ionic',
      '--note': 'Nota para representar la aplicación',
      '--deploy <channel_tag>': 'Despliegue en el canal dado. Por dejecto en el canal de desarrollo'
    },
    alt: ['up'],
    module: './ionic/upload'
  },
  {
    title: 'share',
    name: 'share',
    summary: 'Comparte una aplicación con un cliente, compañero de trabajo o amigo',
    args: {
      '<EMAIL>': 'La dirección de email a la que compartir',
    },
    module: './ionic/share'
  },
  {
    title: 'lib',
    name: 'lib',
    summary: 'Obtiene o actualiza la versión de la librería de Ionic',
    args: {
      '[options]': '',
      '[update]': 'Actualiza Ionic en www/lib/ionic'
    },
    options: {
      '--version|-v': 'Especifica la versión de Ionic\nDe lo contrario se usa la versión por defecto'
    },
    module: './ionic/lib'
  },
  {
    title: 'setup',
    name: 'setup',
    summary: ' Configurar el proyecto con un herramienta de compilación ' + '(beta)'.yellow,
    args: {
      '[sass]': 'Configurar el proyecto para usar el pre-compilador CSS Sass'
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
    title: 'io',
    name: 'io',
    summary: 'Integra tu aplicación con el servicio de ionic.io ' + '(alpha)'.red,
    args: {
      '<command>': 'init'.yellow
    },
    module: './ionic/io-init'
  },
  {
    title: 'push',
    name: 'push',
    summary: 'Sube las credenciales APNS y GCM a Ionic Push ' + '(alpha)'.red,
    options: {
      '--ios-dev-cert': 'Sube tu archivo de desarrollo .p12 a Ionic Push',
      '--ios-prod-cert': 'Sube tu archivo de producciñón .p12 a Ionic Push',
      '--production-mode=y,n': 'Le dice a Ionic Push si usar los servidores APNS de producción (y) o sandbox (n)',
      '--google-api-key <your-gcm-api-key>': "Asigna la clave GCM API de tu aplicación en Ionic Push"
    },
    module: './ionic/push'
  },
  {
    title: 'config',
    name: 'config',
    summary: 'Asigna las variables de configuración para tu aplicación Ionic ' + '(alpha)'.red,
    args: {
      '<command>': 'set'.yellow + ', ' + 'unset'.yellow + ', ' + 'build'.yellow + ', or ' + 'info'.yellow,
      '[key]': 'La clave para asignar',
      '[value]': 'El valor para asignar'
    },
    module: './ionic/io-config'
  },
  {
    title: 'browser',
    name: 'browser',
    summary: 'Añade otro navegador a la plataforma ' + '(beta)'.yellow,
    args: {
      '<command>': '"add remove rm info versions upgrade list ls revert"',
      '[browser]': 'El navegador que desees añadir o eliminar (Crosswalk)'
    },
    options: {
      '--nosave|-n': {
        title: 'No guardar las plataformas y plugins en el fichero package.json',
        boolean: true
      }
    },
    module: './ionic/browser'
  },
  {
    title: 'service add',
    name: 'service',
    summary: 'Añade un paquete de servicio e instala cualquier plugin requerido',
    args: {
      '[options]': '',
      '<SPEC>': 'Puede ser un nombre de servicio o una dirección de git'
    },
    module: './ionic/service'
   },
   {
    title: 'add',
    name: 'add',
    summary: 'Añade un Ion, componente bower o extensión al proyecto',
    args: {
      '[name]': 'El nombre del Ion, componente bower o extensión que desees instalar'
    },
    module: './ionic/add'
   },
   {
    title: 'remove',
    name: 'remove',
    summary: 'Elimina un Ion, componente bower o extensión al proyecto',
    args: {
      '[name]': 'El nombre del Ion, componente bower o extensión que desees eliminar'
    },
    module: './ionic/add',
    alt: ['rm']
   },
   {
    title: 'list',
    name: 'list',
    summary: 'Lista de Ions, componentes bower o extensiones del proyecto',
    module: './ionic/add',
    alt: ['ls']
   },
   {
    title: 'ions',
    name: 'ions',
    summary: 'Lista de ions disponibles para añadir al proyecto',
    module: './ionic/ions'
   },
   {
    title: 'templates',
    name: 'templates',
    summary: 'Lista de plantillas de comienzo disponibles',
    module: './ionic/templates'
   },
   {
     title: 'info',
     name: 'info',
     summary: 'Listado de información sobre los usuarios en tiempo de ejecución',
     module: './ionic/info'
   },
   {
     title: 'help',
     name: 'help',
     summary: 'Proporciona ayuda sobre un comando concreto',
     args: {
       '[command]': 'El comando del que desees ayuda'
     },
     module: './ionic/help'
   },
   {
    title: 'link',
    name: 'link',
    summary: 'Asigna el ID de tu aplicación a el proyecto',
    args: {
      '[appId]': 'El ID de la aplicación que deseas asignar al proyecto'
    },
    options: {
      '--reset|-r': {
        title: 'Esto reiniciará el ID de la aplicación',
        boolean: true
      }
    },
    module: './ionic/link'
   },
   {

    title: 'hooks',
    name: 'hooks',
    summary: 'Manejo de los hooks de Ionic Cordova',
    args: {
      '[add|remove|permissions|perm]': 'Añadir, eliminar, o modificar los permisos\npor defecto de los hooks Ionic Cordova'
    },
    module: './ionic/hooks'
  },
  {
    title: 'state',
    name: 'state',
    summary: 'Guarda o restaura el estado de tu aplicación Ionic usando el fichero package.json',
    args: {
      '<COMMAND>': '[ save | restore | clear | reset ]'
    },
    options: {
      'save': 'Guarda la plataforma y los plugins en el fichero package.json',
      'restore': 'Restaura la plataforma y plugins desde el fichero package.json',
      'clear': 'Limpia el fichero package.json de cordovaPlugins y cordovaPlatforms,\nademás de las plataformas y carpeta de plugins',
      'reset': 'Limpia las plataformas y directorio de plugins y los reinstala',
      '--plugins': {
        title: 'Sólo realizar las operaciones sobre plugins',
        boolean: true
      },
      '--platforms': {
        title: 'Sólo realizar las operaciones sobre las plataformas',
        boolean: true
      }
    },
    module: './ionic/state'
   },
   {
    title: 'docs',
    name: 'docs',
    summary: 'Abrir la documentación de Ionic',
    args: {
      '<TOPIC>': 'El tema para ver la documentación.\nUsa "ls" para ver todos los temas'
    },
    module: './ionic/docs'
   }
];


module.exports = TASKS;
