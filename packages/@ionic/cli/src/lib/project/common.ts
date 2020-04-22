import { findClosestOpenPort } from '@ionic/utils-network';
import * as Debug from 'debug';

import { input, strong } from '../color';
import { FatalException } from '../errors';

const debug = Debug('ionic:lib:project:common');

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
      debug(`Port ${strong(String(ports.port))} taken, using ${strong(String(port))}.`);
      ports.port = port;
    }

    if (ports.livereloadPort !== livereloadPort) {
      debug(`Port ${strong(String(ports.livereloadPort))} taken, using ${strong(String(livereloadPort))}.`);
      ports.livereloadPort = livereloadPort;
    }

    if (ports.notificationPort !== notificationPort) {
      debug(`Port ${strong(String(ports.notificationPort))} taken, using ${strong(String(notificationPort))}.`);
      ports.notificationPort = notificationPort;
    }

    return { port, livereloadPort, notificationPort };
  } catch (e) {
    if (e.code !== 'EADDRNOTAVAIL') {
      throw e;
    }

    throw new FatalException(`${input(address)} is not available--cannot bind.`);
  }
}
