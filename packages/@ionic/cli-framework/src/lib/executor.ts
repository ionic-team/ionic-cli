import {
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  INamespace,
} from '../definitions';

import { metadataToParseArgsOptions, parseArgs } from './command';
import { CommandNotFoundError } from './errors';
import { isNamespace } from '../guards';

export abstract class AbstractExecutor<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> {
  constructor(public namespace: INamespace<T, U, V, W>) {} // TODO: anys

  abstract execute(argv: string[], env: { [key: string]: string; }): Promise<void>;
}

export class Executor<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> extends AbstractExecutor<T, U, V, W> {
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

export async function execute<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption>(namespace: INamespace<T, U, V, W>, argv: string[], env: { [key: string]: string; }) {
  const executor = new Executor(namespace);
  await executor.execute(argv, env);
}
