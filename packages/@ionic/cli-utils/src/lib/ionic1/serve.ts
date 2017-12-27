import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';
import * as proxyMiddlewareType from 'http-proxy-middleware'; // tslint:disable-line:no-implicit-dependencies

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';

import { FatalException } from '../errors';

import {
  BIND_ALL_ADDRESS,
  LOCAL_ADDRESSES,
  findOpenPorts,
  proxyConfigToMiddlewareConfig,
  selectExternalIP,
} from '../serve';

const WATCH_PATTERNS = [
  'scss/**/*',
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map',
];

interface ProxyConfig extends proxyMiddlewareType.Config {
  mount: string;
}

interface ServeMetaOptions extends ServeOptions {
  wwwDir: string;
  watchPatterns: string[];
  proxies: ProxyConfig[];
}

export async function serve({ env, options }: { env: IonicEnvironment; options: ServeOptions; }): Promise<ServeDetails> {
  const { promptToInstallPkg } = await import('../utils/npm');

  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);
  const project = await env.project.load();
  const wwwDir = await env.project.getSourceDir();

  const { port, livereloadPort, notificationPort } = await findOpenPorts(env, options.address, options);

  options.port = port;
  options.livereloadPort = livereloadPort;
  options.notificationPort = notificationPort;

  if (!project.watchPatterns || project.watchPatterns.length === 1 && project.watchPatterns[0] === 'scss/**/*') {
    project.watchPatterns = WATCH_PATTERNS;
  }

  env.log.debug(`Watch patterns: ${project.watchPatterns.map(v => chalk.bold(v)).join(', ')}`);

  const proxies = project.proxies ? project.proxies.map(p => ({ mount: p.path, ...proxyConfigToMiddlewareConfig(p) })) : [];

  const details = [
    `address: ${chalk.bold(options.address)}`,
    `port: ${chalk.bold(String(port))}`,
    `dev server port: ${chalk.bold(String(notificationPort))}`,
  ];

  if (options.livereload) {
    details.push(`livereload port: ${chalk.bold(String(livereloadPort))}`);
  }

  try {
    await ionicV1Serve(env, { wwwDir, watchPatterns: project.watchPatterns, proxies, ...options });
  } catch (e) {
    if (e.code === 'ENOENT') {
      env.log.nl();
      env.log.warn(
        `Looks like ${chalk.green('@ionic/v1-util')} isn't installed in this project.\n` +
        `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
      );

      const installed = await promptToInstallPkg(env, { pkg: '@ionic/v1-util', saveDev: true });

      if (!installed) {
        throw new FatalException(`${chalk.green('@ionic/v1-util')} is required for ${chalk.green('ionic serve')} to work properly.`);
      }
    }
  }

  return {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function ionicV1Serve(env: IonicEnvironment, options: ServeMetaOptions): Promise<void> {
  const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
  const { registerShutdownFunction } = await import('../process');

  const workingDir = env.project.directory;

  const args = ['serve', path.relative(workingDir, options.wwwDir)];

  if (options.consolelogs) {
    args.push('-c');
  }

  const networkArgs = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];
  const watchPatternsArgs = lodash.flatten(options.watchPatterns.map(p => ['-w', p]));
  const proxiesArgs = lodash.flatten(options.proxies.map(p => ['-p', JSON.stringify(p)]));

  const p = await env.shell.spawn('ionic-v1-fake', [...args, ...networkArgs, ...watchPatternsArgs, ...proxiesArgs], { cwd: workingDir, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });

  return new Promise<void>((resolve, reject) => {
    p.on('error', err => {
      reject(err);
    });

    registerShutdownFunction(() => p.kill());

    const log = env.log.clone({ prefix: chalk.dim('[v1]'), wrap: false });
    const ws = log.createWriteStream();

    const stdoutFilter = through2(function(chunk, enc, callback) {
      const str = chunk.toString();

      if (str.includes('server running')) {
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
