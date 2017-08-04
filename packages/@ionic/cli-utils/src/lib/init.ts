import * as minimist from 'minimist';

export const parseArgs = minimist;

/**
 * Map legacy options to their new equivalent
 */
export function modifyArguments(pargv: string[]): string[] {
  let modifiedArgArray: string[] = pargv.slice();
  const minimistArgv = minimist(pargv, { boolean: true, string: '_' });

  if (pargv.length === 0) {
    return ['help'];
  }

  if (minimistArgv['help'] || minimistArgv['h']) {
    if (minimistArgv._.length > 0) {
      return ['help', ...minimistArgv._];
    } else {
      return ['help'];
    }
  }

  if (minimistArgv._.length === 0 && (minimistArgv['version'] || minimistArgv['v'])) {
    return ['version'];
  }

  if (minimistArgv._[0] === 'lab') {
    modifiedArgArray[0] = 'serve';
    modifiedArgArray.push('--lab');
  }

  if (minimistArgv['verbose']) {
    modifiedArgArray[modifiedArgArray.indexOf('--verbose')] = '--log-level=debug';
  }

  if (minimistArgv['quiet']) {
    modifiedArgArray[modifiedArgArray.indexOf('--quiet')] = '--log-level=warn';
  }

  return modifiedArgArray;
}

/**
 * Find the command that is the equivalent of a legacy command.
 */
export function mapLegacyCommand(command: string): string | undefined {
  const commandMap: { [command: string]: string} = {
    'compile': 'cordova compile',
    'emulate': 'cordova emulate',
    'platform': 'cordova platform',
    'plugin': 'cordova plugin',
    'prepare': 'cordova prepare',
    'resources': 'cordova resources',
    'run': 'cordova run',
    'cordova:build': 'cordova build',
    'cordova:compile': 'cordova compile',
    'cordova:emulate': 'cordova emulate',
    'cordova:platform': 'cordova platform',
    'cordova:plugin': 'cordova plugin',
    'cordova:prepare': 'cordova prepare',
    'cordova:resources': 'cordova resources',
    'cordova:run': 'cordova run',
  };

  return commandMap[command];
}
