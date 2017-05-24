import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  filterOptionsByIntent,
  minimistOptionsToArray,
} from '@ionic/cli-utils';

export const CORDOVA_INTENT = 'CORDOVA';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = filterOptionsByIntent(metadata, options, CORDOVA_INTENT);
  const args = minimistOptionsToArray(results, { useEquals: false, allowCamelCase: true });
  let unparsedCdvArgs: string[] = [];
  const indexOfSep = inputs.indexOf('--');

  if (indexOfSep >= 0) {
    unparsedCdvArgs = inputs.splice(indexOfSep);
  }

  if (metadata.inputs) {
    inputs = inputs.slice(0, metadata.inputs.length);
  }

  return [metadata.name].concat(inputs, args, unparsedCdvArgs);
}

/**
 * Start the app scripts server for emulator or device
 */
export function generateBuildOptions(metadata: CommandData, options: CommandLineOptions): CommandLineOptions {
  const results = filterOptionsByIntent(metadata, options);

  // Serve specific options not related to the actual run or emulate code
  return {
    ...results,
    'iscordovaserve': true,
    'externalIpRequired': true,
    'nobrowser': true
  };
}
