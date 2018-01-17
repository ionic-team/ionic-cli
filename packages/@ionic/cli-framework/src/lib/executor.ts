import * as lodash from 'lodash';

import {
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  INamespace,
} from '../definitions';

import { Command, Namespace } from './command';
import { CommandNotFoundError } from './errors';
import { metadataToParseArgsOptions, parseArgs } from './options';
import { isNamespace } from '../guards';

export class BaseExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  constructor(public namespace: N) {}

  async execute(argv: string[], env: { [key: string]: string; }) {
    const parsedArgs = parseArgs(argv, { boolean: true, string: '_' });

    const location = await this.namespace.locate(parsedArgs._);

    if (isNamespace(location.obj)) {
      throw new CommandNotFoundError('Command not found.', parsedArgs._);
    }

    const cmd = location.obj;

    const metadata = await cmd.getMetadata();
    const options = parseArgs(argv, metadataToParseArgsOptions(metadata));
    const inputs = lodash.drop(options._, location.path.length);

    await cmd.validate(inputs);
    await cmd.run(inputs, options, { location });
  }
}

export class Executor extends BaseExecutor<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

export async function execute<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(namespace: N, argv: string[], env: { [key: string]: string; }) {
  const executor = new BaseExecutor<C, N, M, I, O>(namespace);
  await executor.execute(argv, env);
}
