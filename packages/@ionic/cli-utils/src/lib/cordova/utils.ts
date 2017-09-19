import { CommandData, CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../../definitions';
import { filterOptionsByIntent, minimistOptionsToArray } from '../utils/command';

/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
export function filterArgumentsForCordova(metadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): string[] {
  const results = filterOptionsByIntent(metadata, options, 'cordova');
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
  const results = { ...filterOptionsByIntent(metadata, options), ...filterOptionsByIntent(metadata, options, 'app-scripts') };

  // Serve specific options not related to the actual run or emulate code
  return {
    ...results,
    externalAddressRequired: true,
    iscordovaserve: true,
    nobrowser: true,
    target: 'cordova',
  };
}

export async function getCordovaCLIVersion(env: IonicEnvironment): Promise<string | undefined> {
  return env.shell.cmdinfo('cordova', ['-v', '--no-telemetry']);
}

export async function getCordovaPlatformVersions(env: IonicEnvironment): Promise<string | undefined> {
  let cordovaPlatforms = await env.shell.cmdinfo('cordova', ['platform', 'ls', '--no-telemetry']);

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
