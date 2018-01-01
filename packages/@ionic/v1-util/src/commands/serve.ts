import * as path from 'path';
import chalk from 'chalk';

import { Command, CommandLineInputs, CommandLineOptions, validators } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';

import { runServer } from '../lib/serve';

export class ServeCommand extends Command {
  async getMetadata() {
    return {
      name: 'serve',
      description: '',
      inputs: [
        {
          name: 'dir',
          description: 'The www directory to server',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'host',
          description: 'Host of HTTP server',
          default: 'localhost',
        },
        {
          name: 'port',
          description: 'Port of HTTP server',
          default: '8100',
        },
        {
          name: 'dev-port',
          description: 'Port of WebSocket dev server',
          default: '53703',
        },
        {
          name: 'lr-port',
          description: 'Port of WebSocket live-reload server',
          default: '35729',
        },
        {
          name: 'lr',
          description: 'Enable live-reload',
          type: Boolean,
          default: true,
        },
        {
          name: 'consolelogs',
          description: 'Enable console logs to terminal',
          type: Boolean,
          aliases: ['c'],
        },
        {
          name: 'watch',
          description: 'Watch file, directory, or glob pattern relative to cwd',
          aliases: ['w'],
        },
        {
          name: 'proxy',
          description: 'Proxy configuration',
          aliases: ['p'],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const wwwDir = path.resolve(inputs[0]);
    const host = String(options['host']);
    const port = str2num(options['port']);
    const devPort = str2num(options['dev-port']);
    const lrPort = str2num(options['lr-port']);
    const lr = options['lr'] ? true : false;
    const consolelogs = options['consolelogs'] ? true : false;
    const watch = options['watch'];
    const proxy = options['proxy'];

    const watchPatterns = Array.isArray(watch) ? watch : [String(watch)];
    const proxies = Array.isArray(proxy) ? proxy : (proxy ? [JSON.parse(String(proxy))] : []);
    const url = `http://${host}:${port}`;

    process.stdout.write(`Serving directory ${chalk.bold(wwwDir)}\n`);

    await runServer({ host, port, lr, consolelogs, devPort, lrPort, wwwDir, watchPatterns, proxies });

    process.stdout.write(`Dev server running at ${chalk.bold(url)}\n`);
  }
}
