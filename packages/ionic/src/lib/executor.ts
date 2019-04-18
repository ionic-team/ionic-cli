import { AbstractExecutor, metadataOptionsToParseArgsOptions, parseArgs, stripOptions } from '@ionic/cli-framework';

import { PROJECT_FILE } from '../constants';
import { CommandInstanceInfo, CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace } from '../definitions';
import { isCommand } from '../guards';

import { input, strong } from './color';
import { GLOBAL_OPTIONS } from './config';
import { FatalException } from './errors';

export interface ExecutorDeps {
  readonly namespace: INamespace;
}

export class Executor extends AbstractExecutor<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  readonly namespace: INamespace;

  constructor({ namespace }: ExecutorDeps) {
    super();
    this.namespace = namespace;
  }

  async execute(argv: string[], env: NodeJS.ProcessEnv): Promise<void> {
    const pargs = stripOptions(argv, {});

    const location = await this.namespace.locate(pargs);

    if (argv.includes('--version')) {
      return this.execute(['version', ...pargs], env);
    } else if (argv.find(arg => arg === '--help' || arg === '-?' || arg === '-h') || !isCommand(location.obj)) {
      return this.execute(['help', ...pargs], env);
    }

    const cmd = location.obj;
    const path = location.path;
    const subcommandName = path[path.length - 1][0];
    const subcommandNameArgIdx = argv.findIndex(arg => arg === subcommandName);
    const cmdargs = argv.slice(subcommandNameArgIdx + 1);

    await this.run(cmd, cmdargs, { location, env, executor: this });
  }

  async run(command: ICommand, cmdargs: string[], { location, env, executor }: CommandInstanceInfo): Promise<void> {
    const metadata = await command.getMetadata();
    const fullNameParts = location.path.map(([p]) => p);

    if (metadata.options) {
      const optMap = metadataToCmdOptsEnv(metadata, fullNameParts.slice(1));

      // TODO: changes opt by reference, which is probably bad
      for (const [ opt, envvar ] of optMap.entries()) {
        const envdefault = env[envvar];

        if (typeof envdefault !== 'undefined') {
          opt.default = opt.type === Boolean ? (envdefault && envdefault !== '0' ? true : false) : envdefault;
        }
      }
    }

    const metadataOpts = [...metadata.options ? metadata.options : [], ...GLOBAL_OPTIONS];
    const minimistOpts = metadataOptionsToParseArgsOptions(metadataOpts);
    const cmdoptions = parseArgs(cmdargs, minimistOpts);
    const cmdinputs = cmdoptions._;

    if (!this.namespace.project && metadata.type === 'project') {
      throw new FatalException(
        `Sorry! ${input(fullNameParts.join(' '))} can only be run in an Ionic project directory.\n` +
        `If this is a project you'd like to integrate with Ionic, create an ${strong(PROJECT_FILE)} file.`
      );
    }

    await command.execute(cmdinputs, cmdoptions, { location, env, executor });
  }
}

export async function runCommand(runinfo: CommandInstanceInfo, argv: string[]) {
  const { env, executor } = runinfo;

  const metadata = await executor.namespace.getMetadata();
  executor.namespace.env.log.msg(`> ${input([metadata.name, ...argv].map(a => a.includes(' ') ? `"${a}"` : a).join(' '))}`);

  await executor.execute(argv, env);
}

export function metadataToCmdOptsEnv(metadata: CommandMetadata, cmdNameParts: string[]): Map<CommandMetadataOption, string> {
  const optMap = new Map<CommandMetadataOption, string>();

  if (!metadata.options) {
    return optMap;
  }

  const prefix = `IONIC_CMDOPTS_${cmdNameParts.map(s => s.toUpperCase()).join('_')}`;

  for (const option of metadata.options) {
    optMap.set(option, `${prefix}_${option.name.toUpperCase().split('-').join('_')}`);
  }

  return optMap;
}
