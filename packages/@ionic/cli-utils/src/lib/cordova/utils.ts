import { CommandData, CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../../definitions';
import { filterOptionsByIntent, minimistOptionsToArray } from '../utils/command';

export const CORDOVA_INTENT = 'CORDOVA';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = filterOptionsByIntent(metadata, options, CORDOVA_INTENT);
  const args = minimistOptionsToArray(results, { useEquals: false, allowCamelCase: true });
  let unparsedCdvArgs: string[] = [];
  const indexOfSep = inputs.indexOf('--');

  if (indexOfSep >= 0) {
    unparsedCdvArgs = inputs.splice(indexOfSep);
  }

  return [metadata.name].concat(inputs, args, unparsedCdvArgs);
}

/**
 * Start the app scripts server for emulator or device
 */
export function generateBuildOptions(metadata: CommandData, options: CommandLineOptions): CommandLineOptions {
  const results = filterOptionsByIntent(metadata, options);

  // Serve specific options not related to the actual run or emulate code
  return {
    ...results,
    externalAddressRequired: true,
    iscordovaserve: true,
    nobrowser: true,
    target: 'cordova',
  };
}

export async function getCordovaCLIVersion(): Promise<string | undefined> {
  const { getCommandInfo } = await import('../utils/shell');

  return getCommandInfo('cordova', ['-v', '--no-telemetry']);
}

export async function getCordovaPlatformVersions(): Promise<string | undefined> {
  const { getCommandInfo } = await import('../utils/shell');

  let cordovaPlatforms = await getCommandInfo('cordova', ['platform', 'ls', '--no-telemetry']);

  if (cordovaPlatforms) {
    cordovaPlatforms = cordovaPlatforms.replace(/\s+/g, ' ');
    cordovaPlatforms = cordovaPlatforms.replace('Installed platforms:', '');
    cordovaPlatforms = cordovaPlatforms.replace(/Available platforms.+/, '');
    cordovaPlatforms = cordovaPlatforms.trim();
  }

  return cordovaPlatforms;
}

export async function checkCordova(env: IonicEnvironment) {
  const project = await env.project.load();

  if (!project.integrations.cordova) {
    env.log.info('Enabling Cordova integration.');
    await env.runcmd(['config', 'set', 'integrations.cordova', '{}', '--json', '--force']);
  }
}
