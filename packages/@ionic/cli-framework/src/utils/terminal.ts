import * as Debug from 'debug';

import { TerminalInfo } from '../definitions';

const debug = Debug('ionic:cli-framework:utils:terminal');

/**
 * These environment variables work for: Travis CI, CircleCI, Gitlab CI,
 * AppVeyor, CodeShip, Jenkins, TeamCity, Bitbucket Pipelines, AWS CodeBuild
 */
export const CI_ENVIRONMENT_VARIABLES = ['CI', 'BUILD_ID', 'BUILD_NUMBER', 'BITBUCKET_COMMIT', 'CODEBUILD_BUILD_ARN'];

export function getTerminalInfo(): TerminalInfo {
  const vars = CI_ENVIRONMENT_VARIABLES.filter(v => !!process.env[v]);
  const detectedCI = vars.length > 0;

  if (detectedCI) {
    debug(`Environment variables for CI detected: ${vars.join(', ')}`);
  }

  return {
    tty: process.stdout.isTTY ? true : false,
    ci: detectedCI,
  };
}
