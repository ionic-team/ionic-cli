import { ionicCommandOptions, CommandMetadata } from '../ionic';
import { gatherEnvironmentInfo } from '../utils/environmentInfo';

export const metadata: CommandMetadata = {
  name: 'info',
  description: 'List information about the users runtime environment',
  isProjectTask: false
};

export async function run(env: ionicCommandOptions): Promise<void> {
  const logger = env.utils.log;
  const info = await gatherEnvironmentInfo();

  const details: [string, string][] = [
    ['Cordova CLI', info['cordovaVersion']],
    ['Ionic Framework Version', info['ionic']],
    ['Ionic CLI Version', info['cli']],
    ['ios-deploy version', info['iosDeploy']],
    ['ios-sim version', info['iosSim']],
    ['OS', info['os']],
    ['Node Version', info['node']],
    ['Xcode version', info['xcode']]
  ];

  logger.msg(`
Your system information:

${details
  .filter(info => info[1] !== null && info[1] !== undefined)
  .map(info => info[0] + ': ' + info[1])
  .join('\n')
}`);
}
