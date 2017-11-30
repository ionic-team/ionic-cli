import chalk from 'chalk';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, findOpenPorts, selectExternalIP } from '../serve';
import { FatalException } from '../errors';

export interface AppScriptsServeOptions extends ServeOptions {
  platform: string;
  target?: string;
  iscordovaserve: boolean;
}

export async function serve({ env, options }: { env: IonicEnvironment, options: AppScriptsServeOptions }): Promise<ServeDetails> {
  const split2 = await import('split2');
  const { registerShutdownFunction } = await import('../process');
  const { isHostConnectable } = await import('../utils/network');
  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);

  const { port } = await findOpenPorts(env, options.address, options);

  const p = await env.shell.spawn('ng', ['serve', '--host', options.address, '--port', String(port), '--progress', 'false'], { cwd: env.project.directory });

  const log = env.log.clone({ prefix: chalk.dim('[ng]'), wrap: false });
  const ws = log.createWriteStream();

  p.stdout.pipe(split2()).pipe(ws);
  p.stderr.pipe(split2()).pipe(ws);

  registerShutdownFunction(() => { p.kill(); });

  const connectable = await isHostConnectable(externalIP, port, 20000);

  if (!connectable) {
    throw new FatalException(`Could not connect to ng server at ${options.address}:${String(port)}.`);
  }

  return  {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}
