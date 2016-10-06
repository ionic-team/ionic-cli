import { CommandMetadata } from '../ionic';
import { Opts as minimistOptions } from 'minimist';

export function metadataToOptimistOptions(metadata: CommandMetadata): minimistOptions {
  let options: minimistOptions = {
    string: [],
    boolean: [],
    alias: {},
    default: {}
  };

  (metadata.availableOptions || []).forEach(option => {
    options.default[option.name] = option.default;
    options.alias[option.name] = option.aliases;

    if (option.type === String) {
      (<Array<string>>options.string).push(option.name);
    } else if (option.type === Boolean) {
      (<Array<string>>options.boolean).push(option.name);
    }
  });

  return options;
}
