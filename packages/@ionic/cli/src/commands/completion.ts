import { MetadataGroup, ZshCompletionFormatter, getCompletionWords } from '@ionic/cli-framework';
import { TERMINAL_INFO } from '@ionic/utils-terminal';
import * as path from 'path';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';

export class CompletionCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'completion',
      type: 'global',
      summary: 'Enables tab-completion for Ionic CLI commands.',
      description: `
This command is experimental and only works for Z shell (zsh) and non-Windows platforms.

To enable completions for the Ionic CLI, you can add the completion code that this command prints to your ${strong('~/.zshrc')} (or any other file loaded with your shell). See the examples.
      `,
      groups: [MetadataGroup.EXPERIMENTAL],
      exampleCommands: [
        '',
        '>> ~/.zshrc',
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (TERMINAL_INFO.windows) {
      throw new FatalException('Completion is not supported on Windows shells.');
    }

    if (path.basename(TERMINAL_INFO.shell) !== 'zsh') {
      throw new FatalException('Completion is currently only available for Z Shell (zsh).');
    }

    const words = options['--'];

    if (!words || words.length === 0) {
      const namespace = this.namespace.root;
      const formatter = new ZshCompletionFormatter({ namespace });

      process.stdout.write(await formatter.format());

      return;
    }

    const ns = this.namespace.root;
    const outputWords = await getCompletionWords(ns, words.slice(1));

    process.stdout.write(outputWords.join(' '));
  }
}
