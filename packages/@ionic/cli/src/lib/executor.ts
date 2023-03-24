import { BaseExecutor, metadataOptionsToParseArgsOptions, parseArgs, stripOptions } from '@ionic/cli-framework';
import lodash from 'lodash';

import { CommandInstanceInfo, CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace, NamespaceLocateResult } from '../definitions';
import { isCommand } from '../guards';

import { input } from './color';
import { GLOBAL_OPTIONS } from './config';
import { FatalException } from './errors';

export const VERSION_FLAGS: readonly string[] = ['--version', '-v'];
export const HELP_FLAGS: readonly string[] = ['--help', '-?', '-h'];

export interface ExecutorDeps {
  readonly namespace: INamespace;
}

export class Executor extends BaseExecutor<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  async locate(argv: readonly string[]): Promise<NamespaceLocateResult> {
    const pargs = stripOptions(argv, {});
    const location = await this.namespace.locate(pargs);
    const args = lodash.drop(argv, location.path.length - 1);

    if (lodash.intersection(VERSION_FLAGS, argv).length > 0) {
      return this.locate(['version', ...pargs]);
    } else if (lodash.intersection(HELP_FLAGS, argv).length > 0 || !isCommand(location.obj)) {
      return this.locate(['help', ...pargs]);
    }

    return { ...location, args };
  }

  async run(command: ICommand, cmdargs: string[], { location, env, executor }: CommandInstanceInfo): Promise<void> {
    const metadata = await command.getMetadata();
    const parts = getFullCommandParts(location);

    if (metadata.options) {
      const optMap = metadataToCmdOptsEnv(metadata, parts.slice(1));

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

    const { project } = this.namespace;

    if (project) {
      if (project.details.context === 'multiapp') {
        cmdoptions['project'] = project.details.id;
      }
    } else {
      if (metadata.type === 'project') {
        throw new FatalException(
          `Sorry! ${input(parts.join(' '))} can only be run in an Ionic project directory.\n` +
          `If this is a project you'd like to integrate with Ionic, run ${input('ionic init')}.`
        );
      }
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

export function getFullCommandParts(location: NamespaceLocateResult): string[] {
  return location.path.map(([p]) => p);
}
