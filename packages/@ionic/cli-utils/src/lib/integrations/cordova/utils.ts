import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, separateArgv, parsedArgsToArgv } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IonicEnvironment } from '../../../definitions';
import { OptionGroup } from '../../../constants';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandMetadata, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const m = { ...metadata };

  if (!m.options) {
    m.options = [];
  }

  const globalCordovaOpts: CommandMetadataOption[] = [
    {
      name: 'verbose',
      description: '',
      type: Boolean,
      groups: [OptionGroup.Cordova],
    },
  ];

  m.options.push(...globalCordovaOpts);

  const results = filterCommandLineOptionsByGroup(m, options, OptionGroup.Cordova);
  const args = parsedArgsToArgv(results, { useEquals: false, allowCamelCase: true });
  const [ ownArgs, otherArgs ] = separateArgv(inputs);

  return [metadata.name, ...ownArgs, ...args, ...otherArgs];
}

export function generateBuildOptions(metadata: CommandMetadata, options: CommandLineOptions): CommandLineOptions {
  const includesAppScriptsGroup = OptionFilters.includesGroups(OptionGroup.AppScripts);
  const excludesCordovaGroup = OptionFilters.excludesGroups(OptionGroup.Cordova);
  const results = filterCommandLineOptions(metadata, options, o => excludesCordovaGroup(o) || includesAppScriptsGroup(o));

  // Serve specific options not related to the actual run or emulate code
  return {
    ...results,
    externalAddressRequired: true,
    nobrowser: true,
    target: 'cordova',
  };
}

export async function checkCordova(env: IonicEnvironment) {
  const project = await env.project.load();

  if (!project.integrations.cordova) {
    await env.runCommand(['integrations', 'enable', 'cordova']);
  }
}
