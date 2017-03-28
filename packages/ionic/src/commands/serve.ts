import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  load,
  normalizeOptionAliases,
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
      description: 'Test your apps on multiple platform types in the browser',
      type: Boolean,
      aliases: ['l']
    },
    {
      name: 'platform',
      description: 'Start serve with a specific platform (ios/android)',
      aliases: ['t']
    },
    {
      name: 'qrcode',
      description: 'Print a QR code for Ionic View instead of network broadcasting',
      type: Boolean
    }
  ],
  requiresProject: true
})
export class ServeCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    options = normalizeOptionAliases(this.metadata, options);

    const tasks = new TaskChain();

    const numListeners = this.env.emitter.getListeners('serve').length;

    if (numListeners === 0) {
      throw this.exit('No listeners for serve event. Did you install the appropriate plugin?'); // TODO: make better?
    } else if (numListeners > 1) {
      throw this.exit(`Too many listeners for serve event (${numListeners}). Install only one plugin.`); // TODO: make better?
    }

    const [response] = await this.env.emitter.emit('serve', { env: this.env, options });

    // If qrcode option then generate a qrcode on the Command Line.
    if (options.qrcode) {
      const codeString = await generateQrCode(
        `${response.protocol}://${response.publicIp}:${response.httpPort}`
      );
      this.env.log.msg(`\n\n\n${codeString}`);
    }

    // If broadcast option then start udp server and broadcast info
    if (options.broadcast) {
      tasks.next(`Broadcasting server information`);
      const appDetails = await this.env.project.load();

      const message = JSON.stringify({
        app_name: appDetails.name,
        app_id: appDetails.app_id,
        local_address: `${response.protocol}://${response.publicIp}:${response.httpPort}`
      });
      const dgram = load('dgram');
      const server = dgram.createSocket('udp4');

      server.on('listening', () => {
        server.setBroadcast(true);
        setInterval(() => {
          try {
            server.send(message, 41234, '255.255.255.255');
          } catch (e) {
            throw e;
          }
        }, 3000);
      });

      server.bind();
    }

    tasks.end();
  }
}

function generateQrCode(input: string): Promise<string> {
  return new Promise((resolve, reject) => {

    try {
      const qrcode = load('qrcode');
      qrcode.generate(input, (response: any) => {
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}
