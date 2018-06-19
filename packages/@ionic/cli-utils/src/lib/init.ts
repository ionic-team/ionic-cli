import { metadataOptionsToParseArgsOptions, parseArgs, unparseArgs } from '@ionic/cli-framework';

import { GLOBAL_OPTIONS } from './config';

export function modifyArguments(pargv: string[]): string[] {
  const modifiedArgArray: string[] = pargv.slice();
  const minimistArgv = parseArgs(pargv, { boolean: true, string: '_' });

  const extra = [...minimistArgv._, ...unparseArgs(minimistArgv, {}, metadataOptionsToParseArgsOptions(GLOBAL_OPTIONS))];

  if (minimistArgv._.length === 0 && (minimistArgv['version'] || minimistArgv['v'])) {
    return ['version', ...extra];
  }

  if (minimistArgv._.length === 0 || minimistArgv['help'] || minimistArgv['h']) {
    return ['help', ...extra];
  }

  return modifiedArgArray;
}

/**
 * Find the command that is the equivalent of a legacy command.
 */
export function mapLegacyCommand(command: string): string | undefined {
  const commandMap: { [command: string]: string; } = {
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
