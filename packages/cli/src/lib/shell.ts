import { IShell, IShellRunOptions } from '../definitions';
import { FatalException } from './errors';
import { runcmd } from './utils/shell';

export class Shell implements IShell {
  async run(command: string, args?: string[], options: IShellRunOptions = {}): Promise<string> {
    if (typeof options.show === 'undefined') {
      options.show = true;
    }

    if (typeof options.fatal === 'undefined') {
      options.fatal = true;
    }

    if (options.show) {
      console.log(`\n> ${command} ${args && args.length > 0 ? args.join(' ') : ''}\n`);
    }

    try {
      return await runcmd(command, args, options);
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FatalException(`Command not found: ${command}`, 127);
      }

      if (!Array.isArray(e)) {
        throw e;
      }

      let [code, err] = e;

      if (options.fatal) {
        if (options.show) {
          const helpLine = options.stdio === 'inherit' ? '.\n' : (err ? `:\n\n${err}` : ' with no output.\n');
          throw new FatalException(`An error occurred while running the above command (exit code ${code})` + helpLine, code);
        } else {
          throw new FatalException(`Subprocess (${command}) encountered an error (exit code ${code}).`, code);
        }
      }

      throw e;
    }
  }
}
