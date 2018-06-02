import chalk from 'chalk';
import * as Debug from 'debug';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { LOGGER_LEVELS, OptionGroup, createPrefixedFormatter } from '@ionic/cli-framework';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';
import { str2num } from '@ionic/cli-framework/utils/string';
import { isHostConnectable } from '@ionic/cli-framework/utils/network';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1ServeOptions, ServeDetails } from '../../../definitions';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner as BaseServeRunner } from '../../serve';
import { findOpenIonicPorts } from '../common';

export const DEFAULT_PROGRAM = 'ionic-v1';

const debug = Debug('ionic:cli-utils:lib:project:ionic1');

interface ServeCmdDetails {
  program: string;
}

export class ServeRunner extends BaseServeRunner<Ionic1ServeOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      options: [
        {
          name: 'consolelogs',
          summary: 'Print app console logs to Ionic CLI',
          type: Boolean,
          aliases: ['c'],
        },
        {
          name: 'serverlogs',
          summary: 'Print dev server logs to Ionic CLI',
          type: Boolean,
          aliases: ['s'],
          groups: [OptionGroup.Hidden],
        },
        {
          name: 'livereload-port',
          summary: 'Use specific port for live-reload',
          default: DEFAULT_LIVERELOAD_PORT.toString(),
          aliases: ['r'],
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'dev-logger-port',
          summary: 'Use specific port for dev server communication',
          default: DEFAULT_DEV_LOGGER_PORT.toString(),
          groups: [OptionGroup.Advanced],
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Ionic1ServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      ...baseOptions,
      consolelogs: options['consolelogs'] ? true : false,
      serverlogs: options['serverlogs'] ? true : false,
      livereloadPort,
      notificationPort,
    };
  }

  async serveProject(options: Ionic1ServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await findOpenIonicPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const { program } = await this.serveCommandWrapper(options);

    const interval = setInterval(() => {
      this.log.info(`Waiting for connectivity with ${chalk.green(program)}...`);
    }, 5000);

    await isHostConnectable('localhost', port);
    clearInterval(interval);

    return {
      custom: program !== DEFAULT_PROGRAM,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  private async serveCommandWrapper(options: Ionic1ServeOptions): Promise<ServeCmdDetails> {
    try {
      return await this.servecmd(options);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

      const pkg = '@ionic/v1-toolkit';
      const requiredMsg = `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic/CHANGELOG.md#4.0.0')}`;

      this.log.nl();
      this.log.info(`Looks like ${chalk.green(pkg)} isn't installed in this project.\n` + requiredMsg);

      const installed = await this.promptToInstallPkg({ pkg, saveDev: true });

      if (!installed) {
        this.log.nl();
        throw new FatalException(`${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.\n` + requiredMsg);
      }

      return this.servecmd(options);
    }
  }

  private async servecmd(options: Ionic1ServeOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const config = await this.config.load();
    const pkg = await this.project.requirePackageJson();
    const { npmClient } = config;

    let program = DEFAULT_PROGRAM;
    let args = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];
    const shellOptions = { cwd: this.project.directory };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
      program = pkgManager;
      args = pkgArgs;
    } else {
      const v1utilArgs = ['serve'];

      if (options.consolelogs) {
        v1utilArgs.push('-c');
      }

      args = [...v1utilArgs, ...args];
    }

    const p = this.shell.spawn(program, args, shellOptions);
    this.emit('cli-utility-spawn', p);

    return new Promise<ServeCmdDetails>((resolve, reject) => {
      p.on('error', (err: NodeJS.ErrnoException) => {
        if (program === DEFAULT_PROGRAM && err.code === 'ENOENT') {
          reject(new ServeCommandNotFoundException(`${chalk.bold(DEFAULT_PROGRAM)} command not found.`));
        } else {
          reject(err);
        }
      });

      onBeforeExit(async () => p.kill());

      const log = this.log.clone();
      log.setFormatter(createPrefixedFormatter(chalk.dim(`[${program === DEFAULT_PROGRAM ? 'v1' : program}]`)));
      const ws = log.createWriteStream(LOGGER_LEVELS.INFO);

      if (program === DEFAULT_PROGRAM) {
        const stdoutFilter = through2(function(chunk, enc, callback) {
          const str = chunk.toString();

          if (str.includes('server running')) {
            resolve({ program });
          } else {
            this.push(chunk);
          }

          callback();
        });

        p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      } else {
        p.stdout.pipe(split2()).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
        resolve({ program });
      }
    });
  }
}
