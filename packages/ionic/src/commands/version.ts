import { ionicCommandOptions, CommandMetadata } from '../ionic';
import * as path from 'path';

export const metadata: CommandMetadata = {
  name: 'version',
  description: 'Returns the current CLI version',
  availableOptions: [],
  isProjectTask: false
};

export function run(env: ionicCommandOptions): Promise<void> | void {
  const logger = env.utils.log;

  const packageJsonPath = path.resolve(
    process.cwd(),
    'package.json'
  );
  const packageJson = require(packageJsonPath);

  logger.msg(`${packageJson.version}\n`);
}
