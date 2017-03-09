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
    tasks.end();

    const codeString = await generateQrCode(`http://${response.publicIp}:${response.httpPort}`);
    this.env.log.msg(`\n\n\n${codeString}`);

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
