import * as lodash from 'lodash';

import { Colors, CommandInstanceInfo, CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, IExecutor, INamespace, NamespaceLocateResult } from '../definitions';
import { isCommand } from '../guards';

import { DEFAULT_COLORS } from './colors';
import { Command, Namespace } from './command';
import { CommandHelpFormatter, NamespaceHelpFormatter } from './help';
import { metadataToParseArgsOptions, parseArgs, stripOptions } from './options';
import { isNamespace } from '../guards';

export abstract class AbstractExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> implements IExecutor<C, N, M, I, O> {
  abstract readonly namespace: N;

  abstract execute(argv: string[], env: { [key: string]: string; }): Promise<void>;
  abstract run(command: C, cmdargs: string[], runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
}

export interface BaseExecutorDeps<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;
  readonly colors?: Colors;
  readonly stdout?: NodeJS.WriteStream;
  readonly stderr?: NodeJS.WriteStream;
}

export class BaseExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends AbstractExecutor<C, N, M, I, O> {
  readonly colors: Colors;
  readonly namespace: N;
  readonly stdout: NodeJS.WriteStream;
  readonly stderr: NodeJS.WriteStream;

  constructor({ namespace, stdout, stderr, colors }: BaseExecutorDeps<C, N, M, I, O>) {
    super();
    this.namespace = namespace;
    this.colors = colors ? colors : DEFAULT_COLORS;
    this.stdout = stdout ? stdout : process.stdout;
    this.stderr = stderr ? stderr : process.stderr;
  }

  async execute(argv: string[], env: { [key: string]: string; }): Promise<void> {
    const parsedArgs = stripOptions(argv, { includeSeparated: false });
    const location = await this.namespace.locate(parsedArgs);

    if (argv.includes('--help') || isNamespace(location.obj)) {
      this.stdout.write(await this.formatHelp(location));
    } else {
      const cmd = location.obj;
      const cmdargs = lodash.drop(argv, location.path.length - 1);

      await this.run(cmd, cmdargs, { location, env, executor: this });
    }
  }

  async run(command: C, cmdargs: string[], runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void> {
    const metadata = await command.getMetadata();
    const cmdoptions = parseArgs(cmdargs, metadataToParseArgsOptions(metadata));
    const cmdinputs = cmdoptions._;

    await command.validate(cmdinputs);
    await command.run(cmdinputs, cmdoptions, runinfo);
  }

  async formatHelp(location: NamespaceLocateResult<C, N, M, I, O>): Promise<string> {
    if (isCommand(location.obj)) {
      const formatter = new CommandHelpFormatter({ location, command: location.obj });
      return formatter.format();
    } else {
      const formatter = new NamespaceHelpFormatter({ location, namespace: location.obj });
      return formatter.format();
    }
  }
}

export class Executor extends BaseExecutor<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

export async function execute<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>({ namespace, argv, env, ...rest }: { namespace: N; argv: string[]; env: { [key: string]: string; } } & Partial<BaseExecutorDeps<C, N, M, I, O>>) {
  const executor = new BaseExecutor<C, N, M, I, O>({ namespace, ...rest });
  await executor.execute(argv, env);
}
