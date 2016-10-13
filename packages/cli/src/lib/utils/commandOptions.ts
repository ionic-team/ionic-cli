import { Opts as MinimistOpts } from 'minimist';
import { CommandData } from '../../definitions';

export function metadataToOptimistOptions(metadata: CommandData): MinimistOpts {
  let strings: string[] = [];
  let booleans: string[] = [];
  let aliases = {};
  let defaults = {};

  let options: MinimistOpts = {};

  for (let option of metadata.availableOptions || []) {
    defaults[option.name] = option.default;
    aliases[option.name] = option.aliases;

    if (option.type === String) {
      strings.push(option.name);
    } else if (option.type === Boolean) {
      booleans.push(option.name);
    }
  }

  return {
    string: strings,
    boolean: booleans,
    alias: aliases,
    default: defaults
  };
}
