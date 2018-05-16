import * as os from 'os';
import * as split2 from 'split2';

import * as crossSpawnType from 'cross-spawn';

import { ShellCommand } from '@ionic/cli-framework';
import { combineStreams } from '@ionic/cli-framework/utils/streams';

export interface RunCmdOptions extends crossSpawnType.SpawnOptions {
  stdoutPipe?: NodeJS.WritableStream;
  stderrPipe?: NodeJS.WritableStream;
}

const TILDE_PATH_REGEX = /^~($|\/|\\)/;

export function expandTildePath(p: string) {
  const h = os.homedir();
  return p.replace(TILDE_PATH_REGEX, `${h}$1`);
}

export async function runcmd(command: string, args: string[] = [], options: RunCmdOptions = {}): Promise<string> {
  const cmd = new ShellCommand(command, args, options);

  if (options.stdoutPipe && options.stderrPipe) {
    const outstream = combineStreams(split2(), options.stdoutPipe);
    const errstream = combineStreams(split2(), options.stderrPipe);

    await cmd.pipedOutput(outstream, errstream);

    return '';
  }

  return cmd.output();
}

export function prettyCommand(command: string, args: string[]) {
  return command + ' ' + (args.length > 0 ? args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ') : '');
}
