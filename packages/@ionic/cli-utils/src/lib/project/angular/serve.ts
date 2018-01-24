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
import { FatalException } from '../../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, ServeRunner as BaseServeRunner } from '../../serve';

const NG_AUTODETECTED_PROXY_FILES = ['proxy.conf.json', 'proxy.conf.js', 'proxy.config.json', 'proxy.config.js'];
const NG_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:project:angular:serve');

export class ServeRunner extends BaseServeRunner<AngularServeOptions> {
  async specializeCommandMetadata(metadata: CommandMetadata): Promise<CommandMetadata> {
    const options = metadata.options ? metadata.options : [];
    const exampleCommands = ['-- --extract-css=true'];

    options.push(...[
      {
        name: 'dev',
        description: `Sets the build target to ${chalk.green('development')}`,
        type: Boolean,
      },
      {
        name: 'prod',
        description: `Sets the build target to ${chalk.green('production')}`,
        type: Boolean,
      },
      {
        name: 'target',
        description: 'Set the build target to a custom value',
        aliases: ['t'],
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'environment',
        description: 'Set the build environment to a custom value',
        aliases: ['e'],
        groups: [OptionGroup.Advanced],
      },
    ]);

    return {
      ...metadata,
      exampleCommands: metadata.exampleCommands ? [...metadata.exampleCommands, ...exampleCommands] : [],
      longDescription: `${metadata.longDescription}

${chalk.green('ionic serve')} uses the Angular CLI under the hood. Common Angular CLI options such as ${chalk.green('--target')} and ${chalk.green('--environment')} are mixed in with Ionic CLI options. Use ${chalk.green('ng serve --help')} to list all options. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the Angular CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

If a ${chalk.bold('proxy.config.json')} or ${chalk.bold('proxy.config.js')} file is detected in your project, the Angular CLI's ${chalk.green('--proxy-config')} option is automatically specified. You can use ${chalk.green('--no-proxy')} to disable this behavior. See the Angular CLI proxy documentation${chalk.cyan('[2]')} for more information.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build#ng-build')}
${chalk.cyan('[2]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/stories-proxy#proxy-to-backend')}
`,
      options,
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
    const { promptToInstallPkg } = await import('../../utils/npm');
    const { findClosestOpenPort, isHostConnectable } = await import('../../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    debug('finding closest port to %d', options.port);
    const ngPort = await findClosestOpenPort(options.port, '0.0.0.0');
    options.port = ngPort;

    try {
      await this.servecmd(options);
    } catch (e) {
      if (e.code === 'ENOENT') {
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

        await this.servecmd(options);
      }
    }

    debug('waiting for connectivity with ng serve (%dms timeout)', NG_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', ngPort, NG_SERVE_CONNECTIVITY_TIMEOUT);

    return {
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port: ngPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  async servecmd(options: AngularServeOptions): Promise<void> {
    const { registerShutdownFunction } = await import('../../process');

    const ngArgs = await this.serveOptionsToNgArgs(options);
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } };

    const p = await this.env.shell.spawn('ng', ngArgs, shellOptions);

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim('[ng]'), wrap: false });
      const ws = log.createWriteStream();

      const stdoutFilter = through2(function(chunk, enc, callback) {
        const str = chunk.toString();

        if (str.includes('Development Server is listening')) {
          resolve();
        } else {
          this.push(chunk);
        }

        callback();
      });

      p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
      p.stderr.pipe(split2()).pipe(ws);
    });
  }

  async serveOptionsToNgArgs(options: AngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: ['serve'],
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
