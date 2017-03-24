import {
  CommandLineOptions,
} from '@ionic/cli-utils';

export function minimistOptionsToArray(options: CommandLineOptions): string[] {
  return (Object.keys(options || {})).reduce((results, optionName): string[] => {
    if (options[optionName] === true) {
      return results.concat(`--${optionName}`);
    }
    if (typeof options[optionName] === 'string') {
      return results.concat(`--${optionName}`, <string>options[optionName]);
    }
    return results;
  }, <string[]>[]);
}
