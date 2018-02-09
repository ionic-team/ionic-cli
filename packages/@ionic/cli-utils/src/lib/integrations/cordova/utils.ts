import chalk from 'chalk';

import { OptionFilters, filterCommandLineOptions, filterCommandLineOptionsByGroup, unparseArgs } from '@ionic/cli-framework';
import { conform } from '@ionic/cli-framework/utils/array';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IonicEnvironment } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { PROJECT_FILE } from '../../project';

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
      description: '',
      type: Boolean,
      groups: [OptionGroup.Cordova],
    },
  ];

  m.options.push(...globalCordovaOpts);

  const results = filterCommandLineOptionsByGroup(m, options, OptionGroup.Cordova);

  results['target'] = results['cordova-target'];
  delete results['cordova-target'];

  const args = unparseArgs(results, { useEquals: false, allowCamelCase: true });
  const i = args.indexOf('--');

  if (i >= 0) {
    args.splice(i, 1); // join separated args onto main args, use them verbatim
  }

  return [m.name, ...args];
}

export function generateBuildOptions(metadata: CommandMetadata, inputs: CommandLineInputs, options: CommandLineOptions): CommandLineOptions {
  const [ platform ] = inputs;
  const includesAppScriptsGroup = OptionFilters.includesGroups(OptionGroup.AppScripts);
  const excludesCordovaGroup = OptionFilters.excludesGroups(OptionGroup.Cordova);
  const results = filterCommandLineOptions(metadata, options, o => excludesCordovaGroup(o) || includesAppScriptsGroup(o));

  return {
    ...results,
    externalAddressRequired: true,
    nobrowser: true,
    engine: 'cordova',
    platform,
  };
}

export async function checkCordova(env: IonicEnvironment) {
  const { ADD_CORDOVA_ENGINE_HOOK, REMOVE_CORDOVA_ENGINE_HOOK, HOOKS_PKG, locateHook } = await import('../../hooks');

  const project = await env.project.load();

  if (project.integrations.cordova && project.integrations.cordova.enabled === false) {
    return;
  }

  // TODO: better way?
  let hooksNeedInstalling = false;

  if (env.project.type === 'angular') {
    const allowedByConfig = !project.integrations.cordova || project.integrations.cordova.setupEngineHooks !== false;

    const hooksFound = (
      locateHook(env.project.directory, conform(project.hooks['build:before']), ADD_CORDOVA_ENGINE_HOOK) >= 0 &&
      locateHook(env.project.directory, conform(project.hooks['build:after']), REMOVE_CORDOVA_ENGINE_HOOK) >= 0 &&
      locateHook(env.project.directory, conform(project.hooks['serve:before']), ADD_CORDOVA_ENGINE_HOOK) >= 0 &&
      locateHook(env.project.directory, conform(project.hooks['serve:after']), REMOVE_CORDOVA_ENGINE_HOOK) >= 0
    );

    hooksNeedInstalling = allowedByConfig && !hooksFound;

    if (hooksNeedInstalling) {
      env.log.info(
        `Cordova engine hooks not found in existing Cordova integration. Re-enabling integration.\n` +
        `This process will make sure the ${chalk.bold(HOOKS_PKG)} package is installed and that the hooks are defined in ${chalk.bold(PROJECT_FILE)}. To disable this process, run: ${chalk.green('ionic config set integrations.cordova.setupEngineHooks false')}`
      );
    }
  }

  if (!project.integrations.cordova || hooksNeedInstalling) {
    await env.runCommand(['integrations', 'enable', 'cordova']);
  }
}
