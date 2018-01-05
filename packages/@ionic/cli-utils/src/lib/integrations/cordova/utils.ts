import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, parsedArgsToArgv } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicEnvironment } from '../../../definitions';
import { OptionGroup } from '../../../constants';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandMetadata, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = filterCommandLineOptionsByGroup(metadata, options, OptionGroup.Cordova);
  const args = parsedArgsToArgv(results, { useEquals: false, allowCamelCase: true });
  let unparsedCdvArgs: string[] = [];
  const indexOfSep = inputs.indexOf('--');

  if (indexOfSep >= 0) {
    unparsedCdvArgs = inputs.splice(indexOfSep);
  }

  return [metadata.name].concat(inputs, args, unparsedCdvArgs);
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
