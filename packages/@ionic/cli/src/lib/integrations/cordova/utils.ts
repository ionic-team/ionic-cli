import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, unparseArgs } from '@ionic/cli-framework';
import { PromptModule } from '@ionic/cli-framework-prompts';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, ILogger, ProjectType } from '../../../definitions';
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
    open: false,
    engine: 'cordova',
    platform,
    project,
  };
}

export async function checkForUnsupportedProject(type: ProjectType, cmd?: string): Promise<void> {
  if (!SUPPORTED_PROJECT_TYPES.includes(type)) {
    throw new FatalException(
      `Ionic doesn't support using Cordova with ${input(prettyProjectName(type))} projects.\n` +
      `We encourage you to try ${emoji('⚡️ ', '')}${strong('Capacitor')}${emoji(' ⚡️', '')} (${strong('https://ion.link/capacitor')})` +
      (cmd === 'run' ? `\n\nIf you want to run your project natively, see ${input('ionic capacitor run --help')}.` : '') +
      (cmd === 'plugin' ? `\n\nIf you want to add Cordova plugins to your Capacitor project, see these docs${ancillary('[1]')}.\n\n${ancillary('[1]')}: ${strong('https://capacitor.ionicframework.com/docs/cordova/using-cordova-plugins')}` : '')
      // TODO: check for 'ionic cordova resources'
    );
  }
}

export interface ConfirmCordovaUsageDeps {
  log: ILogger;
  prompt: PromptModule;
}

export async function confirmCordovaUsage({ log, prompt }: ConfirmCordovaUsageDeps): Promise<boolean> {
  log.nl();
  log.warn(
    `About to integrate your app with Cordova.\n` +
    `We now recommend ${emoji('⚡️ ', '')}${strong('Capacitor')}${emoji('⚡️ ', '')} (${strong('https://ion.link/capacitor')}) as the official native runtime for Ionic. To learn about the differences between Capacitor and Cordova, see these docs${ancillary('[1]')}. For a getting started guide, see these docs${ancillary('[2]')}.\n\n` +
    `${ancillary('[1]')}: ${strong('https://ion.link/capacitor-differences-with-cordova-docs')}\n` +
    `${ancillary('[2]')}: ${strong('https://ion.link/capacitor-using-with-ionic-docs')}\n`
  );

  const confirm = await prompt({
    type: 'confirm',
    message: 'Are you sure you want to continue?',
    default: true,
  });

  return confirm;
}

export async function confirmCordovaBrowserUsage({ log, prompt }: ConfirmCordovaUsageDeps): Promise<boolean> {
  log.nl();
  log.warn(
    `About to add the ${input('browser')} platform to your app.\n` +
    `${strong(`The ${input('browser')} Cordova platform is not recommended for production use.`)}\n\n` +
    `Instead, we recommend using platform detection and browser APIs to target web/PWA. See the Cross Platform docs${ancillary('[1]')} for details.\n\n` +
    `Alternatively, ${emoji('⚡️ ', '')}${strong('Capacitor')}${emoji(' ⚡️', '')} (${strong('https://ion.link/capacitor')}), Ionic's official native runtime, fully supports traditional web and Progressive Web Apps. See the Capacitor docs${ancillary('[2]')} to learn how easy it is to migrate.\n\n` +
    `${ancillary('[1]')}: ${strong('https://ion.link/cross-platform-docs')}\n` +
    `${ancillary('[2]')}: ${strong('https://ion.link/capacitor-cordova-migration-docs')}\n`
  );

  const confirm = await prompt({
    type: 'confirm',
    message: 'Are you sure you want to continue?',
    default: true,
  });

  return confirm;
}
