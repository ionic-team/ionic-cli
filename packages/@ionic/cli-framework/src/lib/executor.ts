import { EventEmitter } from 'events';

import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, IExecutor, INamespace, NamespaceLocateResult } from '../definitions';
import { BaseError, InputValidationError } from '../errors';
import { isCommand, isNamespace } from '../guards';

import { Colors, DEFAULT_COLORS } from './colors';
import { Command, Namespace } from './command';
import { CommandHelpSchema, CommandSchemaHelpFormatter, CommandStringHelpFormatter, HelpFormatter, NamespaceHelpSchema, NamespaceSchemaHelpFormatter, NamespaceStringHelpFormatter } from './help';
import { metadataOptionsToParseArgsOptions, parseArgs, stripOptions } from './options';
import * as ζipc from '../utils/ipc';

export type HelpRPC<S extends CommandHelpSchema | NamespaceHelpSchema> = ζipc.RPC<'help', [ReadonlyArray<string>], S>;

export interface ExecutorOperations {
  readonly RPC: string;
}

export const EXECUTOR_OPS: ExecutorOperations = Object.freeze({
  RPC: '📡',
});

export abstract class AbstractExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends EventEmitter implements IExecutor<C, N, M, I, O> {
  abstract readonly namespace: N;

  abstract execute(argv: ReadonlyArray<string>, env: { [key: string]: string; }): Promise<void>;
  abstract run(command: C, cmdargs: ReadonlyArray<string>, runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
}

export interface BaseExecutorFormatHelpOptions {
  format?: 'terminal' | 'json';
}

export interface BaseExecutorDeps<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;
  readonly colors?: Colors;
  readonly stdout?: NodeJS.WriteStream;
  readonly stderr?: NodeJS.WriteStream;
}

export interface BaseExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends AbstractExecutor<C, N, M, I, O> {
  on(event: 'operation-rpc', callback: (rpc: ζipc.RPCProcess) => void): this;
  emit(event: 'operation-rpc', rpc: ζipc.RPCProcess): boolean;
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

  /**
   * Locate and execute a command given an array of positional command
   * arguments (argv) and a set of environment variables.
   *
   * If a command is not found, formatted help is automatically output for the
   * right-most namespace found.
   *
   * @param argv Command arguments sliced to the root for the namespace of this
   *             executor. Usually, this means `process.argv.slice(2)`.
   * @param env Environment variables for this execution.
   */
  async execute(argv: ReadonlyArray<string>, env: { [key: string]: string; }): Promise<void> {
    if (argv[0] === EXECUTOR_OPS.RPC) {
      return this.rpc();
    }

    const parsedArgs = stripOptions(argv, { includeSeparated: false });
    const location = await this.namespace.locate(parsedArgs);

    if (argv.find(arg => arg === '--help' || arg === '-?') || isNamespace(location.obj)) {
      const cmdoptions = parseArgs([...argv]);
      this.stdout.write(await this.formatHelp(location, { format: cmdoptions['json'] ? 'json' : 'terminal' }));
    } else {
      const cmd = location.obj;
      const cmdargs = lodash.drop(argv, location.path.length - 1);

      try {
        await this.run(cmd, cmdargs, { location, env, executor: this });
      } catch (e) {
        if (e instanceof BaseError) {
          this.stderr.write(`Error: ${e.message}`);
          process.exitCode = typeof e.exitCode === 'undefined' ? 1 : e.exitCode;
          return;
        }

        throw e;
      }
    }
  }

  async run(command: C, cmdargs: ReadonlyArray<string>, runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void> {
    const { input } = this.colors;
    const metadata = await command.getMetadata();
    const cmdoptions = parseArgs([...cmdargs], metadataOptionsToParseArgsOptions(metadata.options ? metadata.options : []));
    const cmdinputs = cmdoptions._;

    try {
      await command.validate(cmdinputs);
    } catch (e) {
      if (e instanceof InputValidationError) {
        for (const err of e.errors) {
          this.stderr.write(`${err.message}\n`);
        }

        this.stderr.write(`Use the ${input('--help')} flag for more details.\n`);
      }

      throw e;
    }

    await command.run(cmdinputs, cmdoptions, runinfo);
  }

  async formatHelp(location: NamespaceLocateResult<C, N, M, I, O>, { format = 'terminal' }: BaseExecutorFormatHelpOptions = {}): Promise<string> {
    let formatter: HelpFormatter;

    if (isCommand(location.obj)) {
      const options = { location, command: location.obj };
      formatter = format === 'json' ? new CommandSchemaHelpFormatter(options) : new CommandStringHelpFormatter(options);
    } else {
      const options = { location, namespace: location.obj };
      formatter = format === 'json' ? new NamespaceSchemaHelpFormatter(options) : new NamespaceStringHelpFormatter(options);
    }

    return formatter.format();
  }

  /**
   * Initiate RPC operation.
   *
   * This means the CLI has been executed by a parent Node process with an IPC
   * channel, allowing request/response communication via RPC.
   */
  async rpc(): Promise<void> {
    const { RPCProcess } = await import('../utils/ipc');
    const metadata = await this.namespace.getMetadata();

    const rpc = new RPCProcess({ name: metadata.name });

    rpc.register<HelpRPC<CommandHelpSchema | NamespaceHelpSchema>>('help', async ([cmdpath]) => {
      const location = await this.namespace.locate(cmdpath);

      const formatter = isCommand(location.obj)
        ? new CommandSchemaHelpFormatter({ location, command: location.obj })
        : new NamespaceSchemaHelpFormatter({ location, namespace: location.obj });

      return formatter.serialize();
    });

    this.emit('operation-rpc', rpc);

    rpc.start(process);
  }
}

export class Executor extends BaseExecutor<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

export async function execute<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>({ namespace, argv, env, ...rest }: { namespace: N; argv: string[]; env: { [key: string]: string; } } & Partial<BaseExecutorDeps<C, N, M, I, O>>) {
  const executor = new BaseExecutor<C, N, M, I, O>({ namespace, ...rest });
  await executor.execute(argv, env);
}
