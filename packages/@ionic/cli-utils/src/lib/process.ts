import { IonicEnvironment } from '../definitions';

export function registerShutdownFunction(env: IonicEnvironment, fn: () => void) {
  const wrapfn = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', () => { env.log.debug('registerShutdownFunction process.exit/normal shutdown'); wrapfn(); });
  process.on('SIGINT', () => { env.log.debug('registerShutdownFunction: SIGINT'); wrapfn(); });
  process.on('SIGTERM', () => { env.log.debug('registerShutdownFunction: SIGTERM'); wrapfn(); });
  process.on('SIGHUP', () => { env.log.debug('registerShutdownFunction: SIGHUP'); wrapfn(); });
  process.on('SIGBREAK', () => { env.log.debug('registerShutdownFunction: SIGBREAK'); wrapfn(); });
}
