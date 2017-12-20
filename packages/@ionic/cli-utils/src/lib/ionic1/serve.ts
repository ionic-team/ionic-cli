import * as path from 'path';

import chalk from 'chalk';
import * as proxyMiddlewareType from 'http-proxy-middleware';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';

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
  '!www/**/*.map'
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

  await ionicV1Serve(env, { wwwDir, watchPatterns: project.watchPatterns, proxies, ...options });

  return {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function ionicV1Serve(env: IonicEnvironment, options: ServeMetaOptions) {
  const flatten = await import('lodash/flatten');
  const split2 = await import('split2');
  const { registerShutdownFunction } = await import('../process');

  const workingDir = env.project.directory;

  const args = ['serve', path.relative(workingDir, options.wwwDir)];

  if (options.consolelogs) {
    args.push('-c');
  }

  const networkArgs = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];
  const watchPatternsArgs = flatten(options.watchPatterns.map(p => ['-w', p]));
  const proxiesArgs = flatten(options.proxies.map(p => ['-p', JSON.stringify(p)]));

  const p = await env.shell.spawn('ionic-v1', [...args, ...networkArgs, ...watchPatternsArgs, ...proxiesArgs], { cwd: workingDir, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });

  registerShutdownFunction(() => p.kill());

  const log = env.log.clone({ prefix: chalk.dim('[v1]'), wrap: false });
  const ws = log.createWriteStream();

  p.stdout.pipe(split2()).pipe(ws);
  p.stderr.pipe(split2()).pipe(ws);
}
