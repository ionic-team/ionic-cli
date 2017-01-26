import { setSrcContent } from './configXmlUtils';
import {
  appScriptsServe,
  appScriptsBuild
} from './appScripts';

import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  normalizeOptionAliases,
  minimistOptionsToArray
} from '@ionic/cli-utils';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = normalizeOptionAliases(metadata, options);
  const args = minimistOptionsToArray(metadata, results);

  // clean out any cmds that may confuse cordova
  const ignoreCmds = [
    '--livereload',
    '--consolelogs',
    '--serverlogs',
    '--port',
    '--livereload-port',
    '--address'
  ];

  const cleanOptions = args.filter(function(arg, index, fullList) {

    // Only return true if the arg is not found in the ignore Cmds list
    return ignoreCmds.every(ignoreCmd => {
      return arg.search(ignoreCmd) !== 0;
    });
  });

  return [metadata.name].concat(inputs, cleanOptions);
}

/**
 * Start the app scripts server for emulator or device
 */
export async function startAppScriptsServer(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const results = normalizeOptionAliases(metadata, options);
  let args = minimistOptionsToArray(metadata, results);

  // Serve specific options not related to the actual run or emulate code
  args = args.concat([
    '--iscordovaserve',
    '--nobrowser'
  ]);

  const serveSettings = await appScriptsServe(args);
  await setSrcContent(process.cwd(), serveSettings.url);
}

export async function runAppScriptsBuild(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const results = normalizeOptionAliases(metadata, options);
  let args = minimistOptionsToArray(metadata, results);

  await appScriptsBuild(args);
}
