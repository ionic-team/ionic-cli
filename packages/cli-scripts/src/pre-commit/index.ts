import { Command, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';
import { ShellCommand } from '@ionic/cli-framework/utils/shell';

export class PrecommitCommand extends Command {
  needsStash = false;

  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'pre-commit',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    this.needsStash = await this.hasLocalChanges();

    if (this.needsStash) {
      await new ShellCommand('git', ['stash', '-k'], { stdio: 'inherit' }).run();
    }

    onBeforeExit(async () => this.cleanup());

    try {
      await new ShellCommand('lerna', ['run', 'cli-scripts:pre-commit'], { stdio: 'inherit' }).run();
    } catch (e) {
      throw e;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.needsStash) {
      await new ShellCommand('git', ['stash', 'pop'], { stdio: 'inherit' }).run();
    }
  }

  async hasLocalChanges() {
    const cmd = new ShellCommand('git', ['diff', '--quiet', '--exit-code'], { stdio: 'ignore' });

    try {
      await cmd.run();
    } catch (e) {
      return true;
    }

    return false;
  }
}
