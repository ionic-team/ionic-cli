import { CommandData } from '../definitions';
import { Opts as MinimistOpts } from 'minimist';

export function metadataToOptimistOptions(metadata: CommandData): MinimistOpts {
  let strings: string[] = [];
  let booleans: string[] = [];
  let options: MinimistOpts = {
    alias: {},
    default: {}
  };

  for (let option of metadata.availableOptions || []) {
    options.default[option.name] = option.default;
    options.alias[option.name] = option.aliases;

    if (option.type === String) {
      strings.push(option.name);
    } else if (option.type === Boolean) {
      booleans.push(option.name);
    }
  }

  options.string = strings;
  options.boolean = booleans;

  return options;
}
