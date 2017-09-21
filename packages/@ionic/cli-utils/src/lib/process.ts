export function registerShutdownFunction(fn: () => void) {
  const wrapfn = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', wrapfn);
  process.on('SIGINT', wrapfn);
  process.on('SIGTERM', wrapfn);
  process.on('SIGHUP', wrapfn);
  process.on('SIGBREAK', wrapfn);
}
