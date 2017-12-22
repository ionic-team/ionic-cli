import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { BIND_ALL_ADDRESS, BROWSERS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, DEFAULT_SERVER_PORT } from '@ionic/cli-utils/lib/serve';

export class ServeCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'serve',
      type: 'project',
      description: 'Start a local dev server for app dev/testing',
      longDescription: `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

By default, ${chalk.green('ionic serve')} boots up a development server on all network interfaces and prints the external address(es) on which your app is being served. It also broadcasts your app to the Ionic DevApp on your network. To disable the DevApp and bind to ${chalk.green('localhost')}, use ${chalk.green('--local')}.

Try the ${chalk.green('--lab')} option to see multiple platforms at once.
      `,
      exampleCommands: ['-c', '--lab -c'],
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
          visible: false,
        },
        {
          name: 'address',
          description: 'Use specific address for the dev server',
          default: BIND_ALL_ADDRESS,
          advanced: true,
        },
        {
          name: 'port',
          description: 'Use specific port for HTTP',
          default: String(DEFAULT_SERVER_PORT),
          aliases: ['p'],
          advanced: true,
        },
        {
          name: 'livereload',
          description: 'Spin up server to live-reload www files',
          type: Boolean,
          default: true,
          visible: false,
        },
        {
          name: 'livereload-port',
          description: 'Use specific port for live-reload',
          default: String(DEFAULT_LIVERELOAD_PORT),
          aliases: ['r'],
          advanced: true,
        },
        {
          name: 'dev-logger-port',
          description: 'Use specific port for dev server communication',
          default: String(DEFAULT_DEV_LOGGER_PORT),
          advanced: true,
        },
        {
          name: 'devapp',
          description: 'Do not publish DevApp service',
          type: Boolean,
          default: true,
          advanced: true,
        },
        {
          name: 'open',
          description: 'Do not open a browser window',
          type: Boolean,
          default: true,
          // TODO: Adding 'b' to aliases here has some weird behavior with minimist.
        },
        {
          name: 'local',
          description: 'Disable external network usage',
          type: Boolean,
        },
        {
          name: 'proxy',
          description: 'Do not add proxies',
          type: Boolean,
          default: true,
          advanced: true,
          // TODO: Adding 'x' to aliases here has some weird behavior with minimist.
        },
        {
          name: 'browser',
          description: `Specifies the browser to use (${BROWSERS.map(b => chalk.green(b)).join(', ')})`,
          aliases: ['w'],
          advanced: true,
        },
        {
          name: 'browseroption',
          description: `Specifies a path to open to (${chalk.green('/#/tab/dash')})`,
          aliases: ['o'],
          advanced: true,
        },
        {
          name: 'lab',
          description: 'Test your apps on multiple platform types in the browser',
          type: Boolean,
          aliases: ['l'],
        },
        {
          name: 'platform',
          description: `Start serve with a specific platform (${['android', 'ios'].map(t => chalk.green(t)).join(', ')})`,
          aliases: ['t'],
        },
        {
          name: 'auth',
          description: 'HTTP Basic Auth password to secure the server on your local network',
          type: String,
          visible: false,
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (options['nolivereload']) {
      this.env.log.warn(`The ${chalk.green('--nolivereload')} option has been deprecated. Please use ${chalk.green('--no-livereload')}.`);
      options['livereload'] = false;
    }

    if (options['nobrowser']) {
      this.env.log.warn(`The ${chalk.green('--nobrowser')} option has been deprecated. Please use ${chalk.green('--no-open')}.`);
      options['open'] = false;
    }

    if (options['b']) {
      options['open'] = false;
    }

    if (options['noproxy']) {
      this.env.log.warn(`The ${chalk.green('--noproxy')} option has been deprecated. Please use ${chalk.green('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { serve } = await import('@ionic/cli-utils/commands/serve');

    await serve(this.env, inputs, options);
  }
}
