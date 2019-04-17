import * as Debug from 'debug';

const debug = Debug('ionic:utils-terminal');

/**
 * These environment variables work for: Travis CI, CircleCI, Gitlab CI,
 * AppVeyor, CodeShip, Jenkins, TeamCity, Bitbucket Pipelines, AWS CodeBuild
 */
export const CI_ENVIRONMENT_VARIABLES: ReadonlyArray<string> = ['CI', 'BUILD_ID', 'BUILD_NUMBER', 'BITBUCKET_COMMIT', 'CODEBUILD_BUILD_ARN'];
export const CI_ENVIRONMENT_VARIABLES_DETECTED = CI_ENVIRONMENT_VARIABLES.filter(v => !!process.env[v]);

function getShell(): string {
  if (process.env.SHELL) {
    return process.env.SHELL;
  }

  if (process.platform === 'darwin') {
    return '/bin/bash';
  }

  if (process.platform === 'win32') {
    return process.env.COMSPEC ? process.env.COMSPEC : 'cmd.exe';
  }

  return '/bin/sh';
}

if (CI_ENVIRONMENT_VARIABLES_DETECTED.length > 0) {
  debug(`Environment variables for CI detected: ${CI_ENVIRONMENT_VARIABLES_DETECTED.join(', ')}`);
}

export interface TerminalInfo {
  /**
   * Whether this is in CI or not.
   */
  readonly ci: boolean;

  /**
   * Path to the user's shell program.
   */
  readonly shell: string;

  /**
   * Whether the terminal is an interactive TTY or not.
   */
  readonly tty: boolean;

  /**
   * Whether this is a Windows shell or not.
   */
  readonly windows: boolean;
}

export const TERMINAL_INFO: TerminalInfo = Object.freeze({
  ci: CI_ENVIRONMENT_VARIABLES_DETECTED.length > 0,
  shell: getShell(),
  tty: Boolean(process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY),
  windows: process.platform === 'win32' || (
    process.env.OSTYPE && /^(msys|cygwin)$/.test(process.env.OSTYPE) ||
    process.env.MSYSTEM && /^MINGW(32|64)$/.test(process.env.MSYSTEM) ||
    process.env.TERM === 'cygwin'
  ),
});
