import * as lodash from 'lodash';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace } from '../definitions';
import { isCommand } from '../guards';

import { NO_COLORS } from './colors';
import { formatOptionName } from './options';

export async function getCompletionWords<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(ns: N, argv: ReadonlyArray<string>): Promise<string[]> {
  const { obj } = await ns.locate(argv, { useAliases: false });

  if (isCommand(obj)) {
    const metadata = await obj.getMetadata();
    const options = metadata.options ? metadata.options : [];

    if (options.length === 0) {
      return [];
    }

    const optionNames = options
      .map(option => formatOptionName(option, { showAliases: false, showValueSpec: false, colors: NO_COLORS }))
      .filter(name => !argv.includes(name));

    const aliasNames = lodash.flatten(options.map(option => option.aliases ? option.aliases : []))
      .map(alias => `-${alias}`);

    return [...optionNames, ...aliasNames].sort();
  }

  return [
    ...(await obj.getCommands()).keysWithoutAliases(),
    ...(await obj.getNamespaces()).keysWithoutAliases(),
  ].sort();
}

export interface CompletionFormatterDeps<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;
}

export abstract class CompletionFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  protected readonly namespace: N;

  constructor({ namespace }: CompletionFormatterDeps<C, N, M, I, O>) {
    this.namespace = namespace;
  }

  abstract format(): Promise<string>;
}

export class ZshCompletionFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends CompletionFormatter<C, N, M, I, O> {
  async format(): Promise<string> {
    const { name } = await this.namespace.getMetadata();

    return `
###-begin-${name}-completion-###

if type compdef &>/dev/null; then
  __${name}() {
    compadd -- $(${name} completion -- "$\{words[@]}" 2>/dev/null)
  }

  compdef __${name} ${name}
fi

###-end-${name}-completion-###
`;
  }
}
