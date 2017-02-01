import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  appScriptsServe,
  normalizeOptionAliases,
  minimistOptionsToArray,
  TaskChain
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'serve',
  description: 'Start a local development server for app dev/testing',
  exampleCommands: ['--lab --consolelogs -s'],
  options: [
    {
      name: 'consolelogs',
      description: 'Print app console logs to Ionic CLI',
      type: Boolean,
      aliases: ['c']
    },
    {
      name: 'serverlogs',
      description: 'Print dev server logs to Ionic CLI',
      type: Boolean,
      aliases: ['s']
    },
    {
      name: 'port',
      description: 'Dev server HTTP port (8100 default)',
      default: '8100',
      aliases: ['p']
    },
    {
      name: 'livereload-port',
      description: 'Live Reload port (35729 default)',
      default: '35729',
      aliases: ['r']
    },
    {
      name: 'nobrowser',
      description: 'Disable launching a browser',
      type: Boolean,
      aliases: ['b']
    },
    {
      name: 'nolivereload',
      description: 'Do not start live reload',
      type: Boolean,
      aliases: ['d']
    },
    {
      name: 'noproxy',
      description: 'Do not add proxies',
      type: Boolean,
      aliases: ['x']
    },
    {
      name: 'address',
      description: 'Use specific address or return with failure (0.0.0.0 default)',
      default: '0.0.0.0'
    },
    {
      name: 'browser',
      description: 'Specifies the browser to use (safari, firefox, chrome)',
      aliases: ['w']
    },
    {
      name: 'browseroption',
      description: 'Specifies a path to open to (/#/tab/dash)',
      aliases: ['o']
    },
    {
      name: 'lab',
      description: 'Test your apps on multiple screen sizes and platform types',
      type: Boolean,
      aliases: ['l']
    },
    {
      name: 'platform',
      description: 'Start serve with a specific platform (ios/android)',
      aliases: ['t']
    }
  ]
})
export class ServeCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    var tasks = new TaskChain();

    const results = normalizeOptionAliases(this.metadata, options);
    let args = minimistOptionsToArray(this.metadata, results);

    tasks.next(`Starting app-scripts server`);
    await appScriptsServe(args);

    tasks.end();
  }
}
