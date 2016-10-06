import * as util from 'util';

export interface LogOptions {
  level: string;
  prefix: string;
}

export interface Logger {
  trace: Function;
  debug: Function;
  info: Function;
  warn: Function;
  error: Function;
  fatal: Function;
}

const noop = function () {};
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export default function (opts: LogOptions = { level: 'info', prefix: ''}) {
  let logger: Logger;

  function shouldLog (level: string) {
    return levels.indexOf(level) >= levels.indexOf(opts.level);
  }

  function getLogFunction(level: string): Function {
    function log () {
      let prefix = opts.prefix;

      if (prefix) {
        if (typeof prefix === 'function') {
          prefix = prefix();
        }
        arguments[0] = util.format(prefix, arguments[0]);
      }

      switch (level) {
      case 'trace':
      case 'debug':
      case 'info':
        console.info(util.format.apply(util, arguments));
        break;
      case 'warn':
        console.warn(util.format.apply(util, arguments));
        break;
      case 'error':
      case 'fatal':
        console.error(util.format.apply(util, arguments));
        break;
      }
    }
    return shouldLog(level) ? log : noop;
  }

  logger = {
    'trace': getLogFunction('trace'),
    'debug': getLogFunction('debug'),
    'info': getLogFunction('info'),
    'warn': getLogFunction('warn'),
    'error': getLogFunction('error'),
    'fatal': getLogFunction('fatal')
  };

  return logger;
}
