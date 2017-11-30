import * as Debug from 'debug';

const debug = Debug('ionic:cli-utils:lib:process');

const calledFns = new Set<() => void>();

function wrapfn(fn: () => void) {
  if (!calledFns.has(fn)) {
    try {
      calledFns.add(fn);
      fn();
    } finally {
      process.exit();
    }
  }
}

export function registerShutdownFunction(fn: () => void) {
  process.on('exit', () => { debug('registerShutdownFunction process.exit/normal shutdown'); wrapfn(fn); });
  process.on('SIGINT', () => { debug('registerShutdownFunction: SIGINT'); wrapfn(fn); });
  process.on('SIGTERM', () => { debug('registerShutdownFunction: SIGTERM'); wrapfn(fn); });
  process.on('SIGHUP', () => { debug('registerShutdownFunction: SIGHUP'); wrapfn(fn); });
  process.on('SIGBREAK', () => { debug('registerShutdownFunction: SIGBREAK'); wrapfn(fn); });
}
