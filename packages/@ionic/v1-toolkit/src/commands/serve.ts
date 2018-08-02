import chalk from 'chalk';
import * as path from 'path';

import { Command, CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';

import { Config } from '../lib/config';
import { hasTask, runTask } from '../lib/gulp';
import { timestamp } from '../lib/log';
import { WATCH_PATTERNS, proxyConfigToMiddlewareConfig, runServer } from '../lib/serve';

export class ServeCommand extends Command {
  async getMetadata() {
    return {
      name: 'serve',
      summary: '',
      inputs: [],
      options: [
        {
          name: 'host',
          summary: 'Host of HTTP server',
          default: 'localhost',
        },
        {
          name: 'port',
          summary: 'Port of HTTP server',
          default: '8100',
        },
        {
          name: 'dev-port',
          summary: 'Port of WebSocket dev server',
          default: '53703',
        },
        {
          name: 'livereload-port',
          summary: 'Port of WebSocket live-reload server',
          default: '35729',
        },
        {
          name: 'livereload',
          summary: 'Enable live-reload',
          type: Boolean,
          default: true,
        },
        {
          name: 'consolelogs',
          summary: 'Enable console logs to terminal',
          type: Boolean,
          aliases: ['c'],
        },
        {
          name: 'engine',
          summary: `Target engine (e.g. ${['browser', 'cordova'].map(e => chalk.green(e)).join(', ')})`,
          default: 'browser',
        },
        {
          name: 'platform',
          summary: `Target platform on chosen engine (e.g. ${['ios', 'android'].map(e => chalk.green(e)).join(', ')})`,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    const host = String(options['host']);
    const port = str2num(options['port']);
    const devPort = str2num(options['dev-port']);
    const livereload = options['livereload'] ? true : false;
    const livereloadPort = str2num(options['livereload-port']);
    const consolelogs = options['consolelogs'] ? true : false;
    const engine = String(options['engine']);
    const platform = options['platform'] ? String(options['platform']) : undefined;

    const url = `http://${host}:${port}`;

    if (await hasTask('ionic:serve:before')) {
      await runTask('ionic:serve:before');
    }

    const config = new Config(path.resolve(process.cwd(), 'ionic.config.json'));

    const c = config.c;
    const wwwDir = c.documentRoot || 'www';
    const proxies = c.proxies ? c.proxies.map(p => ({ mount: p.path, ...proxyConfigToMiddlewareConfig(p) })) : [];

    if (!c.watchPatterns || c.watchPatterns.length === 1 && c.watchPatterns[0] === 'scss/**/*') {
      config.set('watchPatterns', WATCH_PATTERNS);
      c.watchPatterns = WATCH_PATTERNS;
    }

    process.stdout.write(`${timestamp()} Serving directory ${chalk.bold(wwwDir)}\n`);

    await runServer({
      host,
      port,
      engine,
      platform,
      livereload,
      consolelogs,
      devPort,
      livereloadPort,
      wwwDir,
      watchPatterns: c.watchPatterns,
      proxies,
    });

    process.stdout.write(`${timestamp()} Dev server running at ${chalk.bold(url)}\n`);
  }
}
