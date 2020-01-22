import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, unparseArgs } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, ProjectType } from '../../../definitions';
import { ancillary, input, strong } from '../../color';
import { FatalException } from '../../errors';
import { prettyProjectName } from '../../project';
import { emoji } from '../../utils/emoji';

export const SUPPORTED_PROJECT_TYPES: readonly ProjectType[] = ['custom', 'ionic1', 'ionic-angular', 'angular'];

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandMetadata, options: CommandLineOptions): string[] {
  const m = { ...metadata };

  if (!m.options) {
    m.options = [];
  }

  const globalCordovaOpts: CommandMetadataOption[] = [
    {
      name: 'verbose',
      summary: '',
      type: Boolean,
      groups: ['cordova-cli'],
    },
    {
      name: 'nosave',
      summary: '',
      type: Boolean,
      groups: ['cordova-cli'],
    },
  ];

  m.options.push(...globalCordovaOpts);

  const results = filterCommandLineOptionsByGroup(m.options, options, 'cordova-cli');

  const args = unparseArgs(results, { useEquals: false, allowCamelCase: true });
  const i = args.indexOf('--');

  if (i >= 0) {
    args.splice(i, 1); // join separated args onto main args, use them verbatim
  }

  return [m.name, ...args];
}

export function generateOptionsForCordovaBuild(metadata: CommandMetadata, inputs: CommandLineInputs, options: CommandLineOptions): CommandLineOptions {
  const platform = inputs[0] ? inputs[0] : (options['platform'] ? String(options['platform']) : undefined);
  const project = options['project'] ? String(options['project']) : undefined;

  // iOS does not support port forwarding out-of-the-box like Android does.
  // See https://github.com/ionic-team/native-run/issues/20
  const externalAddressRequired = platform === 'ios' || !options['native-run'];

  const includesAppScriptsGroup = OptionFilters.includesGroups('app-scripts');
  const excludesCordovaGroup = OptionFilters.excludesGroups('cordova-cli');
  const results = filterCommandLineOptions(metadata.options ? metadata.options : [], options, o => excludesCordovaGroup(o) || includesAppScriptsGroup(o));

  return {
    ...results,
    externalAddressRequired,
    nobrowser: true,
    engine: 'cordova',
    platform,
    project,
  };
}

export async function checkForUnsupportedProject(type: ProjectType, cmd?: string): Promise<void> {
  if (!SUPPORTED_PROJECT_TYPES.includes(type)) {
    throw new FatalException(
      `Ionic doesn't support using Cordova with ${input(prettyProjectName(type))} projects.\n` +
      `We encourage you to try ${emoji('⚡️ ', '')}${strong('Capacitor')}${emoji(' ⚡️', '')} (${strong('https://ion.link/capacitor')})\n` +
      (cmd === 'run' ? `\nIf you want to run your project natively, see ${input('ionic capacitor run --help')}.` : '') +
      (cmd === 'plugin' ? `\nIf you want to add Cordova plugins to your Capacitor project, see these docs${ancillary('[1]')}.\n\n${ancillary('[1]')}: ${strong('https://capacitor.ionicframework.com/docs/cordova/using-cordova-plugins')}` : '')
      // TODO: check for 'ionic cordova resources'
    );
  }
}
