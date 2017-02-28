import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  minimistOptionsToArray,
} from '@ionic/cli-utils';

export const CORDOVA_INTENT = 'CORDOVA';

function filterByIntent(metadata: CommandData, options: CommandLineOptions, intentName?: string) {
  return Object.keys(options).reduce((allOptions, optionName) => {
    const metadataOptionFound = (metadata.options || []).find((mdOption) => (
      mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
    ));
    if (metadataOptionFound) {
        if (intentName && metadataOptionFound.intent === intentName) {
          allOptions[optionName] = options[optionName];
        } else if (!intentName && !metadataOptionFound.intent) {
          allOptions[optionName] = options[optionName];
        }
    }
    return allOptions;
  }, <CommandLineOptions>{});
}

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = filterByIntent(metadata, options, CORDOVA_INTENT);
  const args = minimistOptionsToArray(results);

  return [metadata.name].concat(inputs, args);
}

/**
 * Start the app scripts server for emulator or device
 */
export function generateBuildOptions(metadata: CommandData, options: CommandLineOptions): CommandLineOptions {
  const results = filterByIntent(metadata, options);

  // Serve specific options not related to the actual run or emulate code
  return {
    ...results,
    'iscordovaserve': true,
    'nobrowser': true
  };
}
