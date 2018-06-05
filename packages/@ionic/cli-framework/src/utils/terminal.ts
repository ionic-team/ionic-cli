import * as Debug from 'debug';

const debug = Debug('ionic:cli-framework:utils:terminal');

/**
 * These environment variables work for: Travis CI, CircleCI, Gitlab CI,
 * AppVeyor, CodeShip, Jenkins, TeamCity, Bitbucket Pipelines, AWS CodeBuild
 */
export const CI_ENVIRONMENT_VARIABLES: ReadonlyArray<string> = ['CI', 'BUILD_ID', 'BUILD_NUMBER', 'BITBUCKET_COMMIT', 'CODEBUILD_BUILD_ARN'];
export const CI_ENVIRONMENT_VARIABLES_DETECTED = CI_ENVIRONMENT_VARIABLES.filter(v => !!process.env[v]);

if (CI_ENVIRONMENT_VARIABLES_DETECTED.length > 0) {
  debug(`Environment variables for CI detected: ${CI_ENVIRONMENT_VARIABLES_DETECTED.join(', ')}`);
}

export interface TerminalInfo {
  readonly tty: boolean;
  readonly ci: boolean;
}

export const TERMINAL_INFO: TerminalInfo = Object.freeze({
  tty: Boolean(process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY),
  ci: CI_ENVIRONMENT_VARIABLES_DETECTED.length > 0,
});
