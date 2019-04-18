import { Command, CommandHelpSchemaFootnote, CommandHelpSchemaInput, CommandHelpSchemaOption, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { strcmp } from '@ionic/cli-framework/utils/string';
import { mkdirp, remove, writeFile } from '@ionic/utils-fs';
import chalk from 'chalk';
import { ProjectType, generateContext, loadExecutor } from 'ionic';
import { CommandHelpSchema, NamespaceSchemaHelpFormatter } from 'ionic/lib/help';
import * as path from 'path';
import stripAnsi from 'strip-ansi';

import { ansi2md, links2md } from './utils';

const PROJECTS_DIRECTORY = path.resolve(__dirname, '..', '..', 'projects');
const STAGING_DIRECTORY = path.resolve(__dirname, '..', '..', '..', '..', 'docs');

export class DocsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    await remove(STAGING_DIRECTORY);
    await mkdirp(STAGING_DIRECTORY);

    const projectTypes: ProjectType[] = ['angular', 'ionic-angular', 'ionic1'];
    const baseCtx = await generateContext();

    for (const projectType of projectTypes) {
      // TODO: possible to do this without a physical directory?
      const ctx = { ...baseCtx, execPath: path.resolve(PROJECTS_DIRECTORY, projectType) };
      const executor = await loadExecutor(ctx, []);

      const location = await executor.namespace.locate([]);
      const formatter = new NamespaceSchemaHelpFormatter({ location, namespace: executor.namespace });
      const formatted = await formatter.serialize();
      const projectJson = { type: projectType, ...formatted };

      // TODO: `serialize()` from base formatter isn't typed properly
      projectJson.commands = await Promise.all(projectJson.commands.map(async cmd => this.extractCommand(cmd as CommandHelpSchema)));
      projectJson.commands.sort((a, b) => strcmp(a.name, b.name));

      await writeFile(path.resolve(STAGING_DIRECTORY, `${projectType}.json`), JSON.stringify(projectJson, undefined, 2) + '\n', { encoding: 'utf8' });
    }

    process.stdout.write(`${chalk.green('Done.')}\n`);
  }

  private async extractCommand(command: CommandHelpSchema): Promise<CommandHelpSchema> {
    return {
      ...command,
      summary: stripAnsi(links2md(ansi2md(command.summary))).trim(),
      description: await this.formatFootnotes(stripAnsi(links2md(ansi2md(command.description))).trim(), command.footnotes),
      footnotes: command.footnotes.filter(footnote => footnote.type !== 'link'), // we format link footnotes in `formatFootnotes()`
      inputs: await Promise.all(command.inputs.map(input => this.extractInput(input))),
      options: await Promise.all(command.options.map(opt => this.extractOption(opt))),
    };
  }

  private async formatFootnotes(description: string, footnotes: ReadonlyArray<CommandHelpSchemaFootnote>): Promise<string> {
    return description.replace(/(\S+)\[\^([A-z0-9-]+)\]/g, (match, p1, p2) => {
      const m = Number.parseInt(p2, 10);
      const id = !Number.isNaN(m) ? m : p2;
      const foundFootnote = footnotes.find(footnote => footnote.id === id);

      if (!foundFootnote) {
        throw new Error('Bad footnote.');
      }

      return foundFootnote.type === 'link' ? `[${p1}](${foundFootnote.url})` : match; // TODO: handle text footnotes
    });
  }

  private async extractInput(input: CommandHelpSchemaInput): Promise<CommandHelpSchemaInput> {
    return {
      ...input,
      summary: stripAnsi(links2md(ansi2md(input.summary))).trim(),
    };
  }

  private async extractOption(option: CommandHelpSchemaOption): Promise<CommandHelpSchemaOption> {
    return {
      ...option,
      summary: stripAnsi(links2md(ansi2md(option.summary))).trim(),
    };
  }
}
