import { Opts as MinimistOpts } from 'minimist';

import {
  CommandData,
  CommandOption,
  CommandOptionDefault,
  CommandOptionType,
  CommandOptionTypeDefaults,
  NormalizedCommandOption
} from '../../definitions';

export interface NormalizedMinimistOpts extends MinimistOpts {
  string: string[],
  boolean: string[],
  alias: { [key: string]: string[] },
  default: { [key: string]: CommandOptionDefault }
}

const typeDefaults: CommandOptionTypeDefaults = new Map<CommandOptionType, CommandOptionDefault>()
  .set(String, null)
  .set(Boolean, false);

function normalizeOption(option: CommandOption): NormalizedCommandOption {
  if (!option.type) {
    option.type = String;
  }

  if (!option.default) {
    option.default = typeDefaults.get(option.type);
  }

  if (!option.aliases) {
    option.aliases = [];
  }

  return option as NormalizedCommandOption;
}

export function metadataToOptimistOptions(metadata: CommandData): NormalizedMinimistOpts {
  let options: NormalizedMinimistOpts = {
    string: [],
    boolean: [],
    alias: {},
    default: {}
  };

  if (!metadata.options) {
    return options;
  }

  for (let option of metadata.options.map(o => normalizeOption(o))) {
    if (option.type === String) {
      options.string.push(option.name);
    } else if (option.type === Boolean) {
      options.boolean.push(option.name);
    }

    options.default[option.name] = option.default;
    options.alias[option.name] = option.aliases;
  }

  return options;
}
