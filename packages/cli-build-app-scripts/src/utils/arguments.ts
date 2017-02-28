import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';

function minimistOptionsToArray(options: CommandLineOptions): string[] {
  return (Object.keys(options || {})).reduce((results, optionName): string[] => {
    if (options[optionName] === true) {
      return results.concat(`--${optionName}`);
    }
    if (typeof options[optionName] === 'string') {
      return results.concat(`--${optionName}=${options[optionName]}`);
    }
    return results;
  }, <string[]>[]);
}

export function generateAppScriptsArguments(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  let args = minimistOptionsToArray(options);

  // Serve specific options not related to the actual run or emulate code
  return args.concat([
    '--iscordovaserve',
    '--nobrowser'
  ]);
}
