import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { pathAccessible } from '@ionic/cli-framework/utils/fs';

import { AngularServeOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner as BaseServeRunner } from '../../serve';

const DEFAULT_PROGRAM = 'ng';
const NG_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms
const NG_AUTODETECTED_PROXY_FILES = ['proxy.conf.json', 'proxy.conf.js', 'proxy.config.json', 'proxy.config.js'];

const debug = Debug('ionic:cli-utils:lib:project:angular:serve');

interface ServeCmdDetails {
  program: string;
}

export class ServeRunner extends BaseServeRunner<AngularServeOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      exampleCommands: ['-- --extract-css=true'],
      longDescription: `
${chalk.green('ionic serve')} uses the Angular CLI under the hood. Common Angular CLI options such as ${chalk.green('--target')} and ${chalk.green('--environment')} are mixed in with Ionic CLI options. Use ${chalk.green('ng serve --help')} to list all options. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the Angular CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

If a ${chalk.bold('proxy.config.json')} or ${chalk.bold('proxy.config.js')} file is detected in your project, the Angular CLI's ${chalk.green('--proxy-config')} option is automatically specified. You can use ${chalk.green('--no-proxy')} to disable this behavior. See the Angular CLI proxy documentation${chalk.cyan('[2]')} for more information.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build#ng-build')}
${chalk.cyan('[2]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/stories-proxy#proxy-to-backend')}`,
      options: [
        {
          name: 'dev',
          description: `Sets the build target to ${chalk.green('development')}`,
          type: Boolean,
          hint: 'ng',
        },
        {
          name: 'prod',
          description: `Sets the build target to ${chalk.green('production')}`,
          type: Boolean,
          hint: 'ng',
        },
        {
          name: 'target',
          description: 'Set the build target to a custom value',
          aliases: ['t'],
          groups: [OptionGroup.Advanced],
          hint: 'ng',
        },
        {
          name: 'environment',
          description: 'Set the build environment to a custom value',
          aliases: ['e'],
          groups: [OptionGroup.Advanced],
          hint: 'ng',
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    let target = options['target'] ? String(options['target']) : undefined;
    const environment = options['environment'] ? String(options['environment']) : undefined;

    if (!target) {
      if (options['dev']) {
        target = 'development';
      } else if (options['prod']) {
        target = 'production';
      }
    }

    return {
      ...baseOptions,
      target,
      environment,
    };
  }

  async serveProject(options: AngularServeOptions): Promise<ServeDetails> {
    const { findClosestOpenPort, isHostConnectable } = await import('../../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    debug('finding closest port to %d', options.port);
    const ngPort = await findClosestOpenPort(options.port, '0.0.0.0');
    options.port = ngPort;

    const { program } = await this.serveCommandWrapper(options);

    debug('waiting for connectivity with ng serve (%dms timeout)', NG_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', ngPort, NG_SERVE_CONNECTIVITY_TIMEOUT);

    return {
      custom: program !== DEFAULT_PROGRAM,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port: ngPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  private async serveCommandWrapper(options: AngularServeOptions): Promise<ServeCmdDetails> {
    const { promptToInstallPkg } = await import('../../utils/npm');

    try {
      return await this.servecmd(options);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

      const pkg = '@angular/cli';
      this.env.log.nl();
      this.env.log.warn(
        `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
        `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
      );

      const installed = await promptToInstallPkg(this.env, { pkg, saveDev: true });

      if (!installed) {
        throw new FatalException(`${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.`);
      }

      return this.servecmd(options);
    }
  }

  private async servecmd(options: AngularServeOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const { registerShutdownFunction } = await import('../../process');

    const config = await this.env.config.load();
    const pkg = await this.env.project.loadPackageJson();
    const { npmClient } = config;

    let program = DEFAULT_PROGRAM;
    let args = await this.serveOptionsToNgArgs(options);
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
      program = pkgManager;
      args = pkgArgs;
    } else {
      args = ['serve', ...args];
    }

    const p = await this.env.shell.spawn(program, args, shellOptions);

    return new Promise<ServeCmdDetails>((resolve, reject) => {
      p.on('error', (err: NodeJS.ErrnoException) => {
        if (program === DEFAULT_PROGRAM && err.code === 'ENOENT') {
          reject(new ServeCommandNotFoundException(`${chalk.bold(DEFAULT_PROGRAM)} command not found.`));
        } else {
          reject(err);
        }
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim(`[${program}]`), wrap: false });
      const ws = log.createWriteStream();

      if (program === DEFAULT_PROGRAM) {
        const stdoutFilter = through2(function(chunk, enc, callback) {
          const str = chunk.toString();

          if (!str.includes('Development Server is listening')) {
            this.push(chunk);
          }

          callback();
        });

        p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      } else {
        p.stdout.pipe(split2()).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      }

      resolve({ program });
    });
  }

  async serveOptionsToNgArgs(options: AngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      host: options.address,
      port: String(options.port),
      progress: 'false',
      target: options.target,
      environment: options.environment,
    };

    if (options.proxy) {
      const proxyConfig = await this.detectProxyConfig();
      // this is fine as long as cwd of ng serve is the project directory

      if (proxyConfig) {
        args.proxyConfig = proxyConfig;
      }
    }

    return [...unparseArgs(args, {}), ...options['--']];
  }

  async detectProxyConfig(): Promise<string | undefined> {
    for (const f of NG_AUTODETECTED_PROXY_FILES) {
      if (await pathAccessible(path.resolve(this.env.project.directory, f), fs.constants.R_OK)) {
        debug(`Detected ${chalk.bold(f)} proxy file`);
        return f;
      }
    }

    debug(`None of the following proxy files found: ${NG_AUTODETECTED_PROXY_FILES.map(f => chalk.bold(f)).join(', ')}`);
  }
}
