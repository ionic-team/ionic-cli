import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  normalizeOptionAliases,
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
  let results = normalizeOptionAliases(metadata, options);
  results = filterByIntent(metadata, results, CORDOVA_INTENT);

  const args = minimistOptionsToArray(results);

  return [metadata.name].concat(inputs, args);
}

/**
 * Start the app scripts server for emulator or device
 */
export function generateAppScriptsArguments(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  let results = normalizeOptionAliases(metadata, options);
  results = filterByIntent(metadata, results);

  let args = minimistOptionsToArray(results);

  // Serve specific options not related to the actual run or emulate code
  return args.concat([
    '--iscordovaserve',
    '--nobrowser'
  ]);
}
