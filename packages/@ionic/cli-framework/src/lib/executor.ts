import { CommandData, CommandInput, CommandOption } from '../definitions';

import { Command } from './command';
import { CommandNotFoundError } from './errors';
import { Namespace } from './namespace';
import { metadataToParseArgsOptions, parseArgs } from './command';

export abstract class AbstractExecutor<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> {
  constructor(public namespace: Namespace<T, U, V, W>) {} // TODO: anys

  abstract execute(argv: string[], env: { [key: string]: string; }): Promise<void>;
}

export class Executor<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> extends AbstractExecutor<T, U, V, W> {
  async execute(argv: string[], env: { [key: string]: string; }) {
    const parsedArgs = parseArgs(argv, { boolean: true, string: '_' });

    const [ , , cmd ] = await this.namespace.locate(parsedArgs._);

    if (cmd instanceof Namespace) {
      throw new CommandNotFoundError('Command not found.', parsedArgs._);
    }

    const args = parseArgs(argv, metadataToParseArgsOptions(cmd.metadata));

    await cmd.validate(args._);
    await cmd.run(args._, args);
  }
}

export async function execute<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption>(namespace: Namespace<T, U, V, W>, argv: string[], env: { [key: string]: string; }) {
  const executor = new Executor(namespace);
  await executor.execute(argv, env);
}
