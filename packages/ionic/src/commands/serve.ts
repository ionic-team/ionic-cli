import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

@CommandMetadata({
  name: 'serve',
  type: 'project',
  description: 'Start a local dev server for app dev/testing',
  longDescription: `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

Try the ${chalk.green('--lab')} option to see multiple platforms at once.
  `,
  exampleCommands: ['-lcs', '--lab -lcs'],
  options: [
    {
      name: 'consolelogs',
      description: 'Print app console logs to Ionic CLI',
      type: Boolean,
      aliases: ['c'],
    },
    {
      name: 'serverlogs',
      description: 'Print dev server logs to Ionic CLI',
      type: Boolean,
      aliases: ['s'],
    },
    {
      name: 'port',
      description: 'Dev server HTTP port',
      default: '8100',
      aliases: ['p'],
    },
    {
      name: 'livereload-port',
      description: 'Live Reload port',
      default: '35729',
      aliases: ['r'],
    },
    {
      name: 'nobrowser',
      description: 'Disable launching a browser',
      type: Boolean,
      aliases: ['b'],
    },
    {
      name: 'nolivereload',
      description: 'Do not start live reload',
      type: Boolean,
      aliases: ['d'],
    },
    {
      name: 'noproxy',
      description: 'Do not add proxies',
      type: Boolean,
      aliases: ['x'],
    },
    {
      name: 'address',
      description: 'Network address for server',
      default: '0.0.0.0',
    },
    {
      name: 'browser',
      description: `Specifies the browser to use (${['safari', 'firefox', 'chrome'].map(b => chalk.green(b)).join(', ')})`,
      aliases: ['w'],
    },
    {
      name: 'browseroption',
      description: 'Specifies a path to open to (/#/tab/dash)',
      aliases: ['o'],
    },
    {
      name: 'lab',
      description: 'Test your apps on multiple platform types in the browser',
      type: Boolean,
      aliases: ['l'],
    },
    {
      name: 'nogulp',
      description: 'Disable gulp',
      type: Boolean,
    },
    {
      name: 'nosass',
      description: 'Disable sass',
      type: Boolean,
    },
    {
      name: 'platform',
      description: 'Start serve with a specific platform (ios/android)',
      aliases: ['t'],
    },
  ],
})
export class ServeCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ response ] = await this.env.hooks.fire('command:serve', {
      cmd: this,
      env: this.env,
      inputs,
      options: {
        ...options,
        externalIpRequired: options.broadcast
      }
    });

    // If broadcast option then start udp server and broadcast info
    if (options.broadcast) {
      this.env.tasks.next(`Broadcasting server information`);
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

    this.env.tasks.end();
  }
}
