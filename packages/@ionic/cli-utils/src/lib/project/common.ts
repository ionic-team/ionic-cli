import { findClosestOpenPort } from '@ionic/utils-network';
import chalk from 'chalk';
import * as Debug from 'debug';

import { FatalException } from '../errors';

const debug = Debug('ionic:cli-utils:lib:project:common');

export interface Ports {
  port: number;
  livereloadPort: number;
  notificationPort: number;
}

/**
 * Convenience function for finding open ports of old-style projects.
 *
 * For `ionic-angular` and `ionic1`, Ionic provides the livereload server and
 * "dev logger" server.
 */
export async function findOpenIonicPorts(address: string, ports: Ports): Promise<Ports> {
  try {
    const [ port, livereloadPort, notificationPort ] = await Promise.all([
      findClosestOpenPort(ports.port),
      findClosestOpenPort(ports.livereloadPort),
      findClosestOpenPort(ports.notificationPort),
    ]);

    if (ports.port !== port) {
      debug(`Port ${chalk.bold(String(ports.port))} taken, using ${chalk.bold(String(port))}.`);
      ports.port = port;
    }

    if (ports.livereloadPort !== livereloadPort) {
      debug(`Port ${chalk.bold(String(ports.livereloadPort))} taken, using ${chalk.bold(String(livereloadPort))}.`);
      ports.livereloadPort = livereloadPort;
    }

    if (ports.notificationPort !== notificationPort) {
      debug(`Port ${chalk.bold(String(ports.notificationPort))} taken, using ${chalk.bold(String(notificationPort))}.`);
      ports.notificationPort = notificationPort;
    }

    return { port, livereloadPort, notificationPort };
  } catch (e) {
    if (e.code !== 'EADDRNOTAVAIL') {
      throw e;
    }

    throw new FatalException(`${chalk.green(address)} is not available--cannot bind.`);
  }
}
