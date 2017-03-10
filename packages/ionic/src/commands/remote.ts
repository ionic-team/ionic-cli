import * as dgram from 'dgram';
import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  normalizeOptionAliases,
  TaskChain
} from '@ionic/cli-utils';
import * as qrcode from 'qrcode-terminal';

@CommandMetadata({
  name: 'remote',
  description: 'Start a local development server for remote app dev/testing',
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
      name: 'qrcode',
      description: 'Print a QR code for Ionic View instead of network broadcasting',
      type: Boolean
    }
  ],
  requiresProject: true
})
export class RemoteCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    options = normalizeOptionAliases(this.metadata, options);
    options['nobrowser'] = true;

    var tasks = new TaskChain();
    var response = await this.env.emitEvent('serve', {
      metadata: this.metadata,
      inputs,
      options
    });

    tasks.next(`Starting server`);

    if (options.qrcode) {
      const codeString = await generateQrCode(`http://${response.publicIp}:${response.httpPort}`);
      this.env.log.msg(`\n\n\n${codeString}`);

    } else {
      tasks.next(`Broadcasting server information`);
      const appDetails = await this.env.project.load();

      const message = JSON.stringify({
        app_name: appDetails.name,
        app_id: appDetails.app_id,
        local_address: `http://${response.publicIp}:${response.httpPort}`
      });
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
      qrcode.generate(input, (response: any) => {
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}
