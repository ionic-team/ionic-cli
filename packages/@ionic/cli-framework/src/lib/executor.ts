import {
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  INamespace,
} from '../definitions';

import { CommandNotFoundError } from './errors';
import { metadataToParseArgsOptions, parseArgs } from './options';
import { isNamespace } from '../guards';

export abstract class BaseExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  constructor(public namespace: N) {}

  abstract execute(argv: string[], env: { [key: string]: string; }): Promise<void>;
}

export class Executor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends BaseExecutor<C, N, M, I, O> {
  async execute(argv: string[], env: { [key: string]: string; }) {
    const parsedArgs = parseArgs(argv, { boolean: true, string: '_' });

    const { args, obj } = await this.namespace.locate(parsedArgs._);

    if (isNamespace(obj)) {
      throw new CommandNotFoundError('Command not found.', parsedArgs._);
    }

    const cmd = obj;

    const metadata = await cmd.getMetadata();
    const options = parseArgs(argv, metadataToParseArgsOptions(metadata));

    await cmd.validate(args);
    await cmd.run(args, options);
  }
}

export async function execute<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(namespace: N, argv: string[], env: { [key: string]: string; }) {
  const executor = new Executor(namespace);
  await executor.execute(argv, env);
}
